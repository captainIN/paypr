// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PayPR {
    IERC20 public immutable pyusd; // Arb Sepolia 0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1
    address public owner;

    struct Repository {
        address maintainer;
        uint256 bountyAmount;
        uint256 totalFunds;
        bool active;
    }

    struct Developer {
        address wallet;
        string githubUsername;
        uint256 totalEarned;
    }

    struct Payment {
        string repoName;
        string developerGithub;
        uint256 prNumber;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(string => Repository) public repositories;
    mapping(string => Developer) public developers;
    mapping(uint256 => Payment) public payments;
    uint256 public paymentCounter;

    event RepositoryRegistered(
        string indexed repoName,
        address indexed maintainer,
        uint256 bountyAmount
    );
    event DeveloperRegistered(
        string indexed githubUsername,
        address indexed wallet
    );
    event BountyPaid(
        string indexed repoName,
        string indexed developerGithub,
        uint256 indexed prNumber,
        uint256 amount
    );
    event FundsDeposited(string indexed repoName, uint256 amount);

    constructor(address _pyusd) {
        pyusd = IERC20(_pyusd);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function registerRepository(
        string calldata repoName,
        uint256 bountyAmount
    ) external {
        require(bytes(repoName).length > 0, "Invalid repo name");
        require(bountyAmount > 0, "Invalid bounty amount");

        repositories[repoName] = Repository({
            maintainer: msg.sender,
            bountyAmount: bountyAmount,
            totalFunds: 0,
            active: true
        });

        emit RepositoryRegistered(repoName, msg.sender, bountyAmount);
    }

    function registerDeveloper(string calldata githubUsername) external {
        require(bytes(githubUsername).length > 0, "Invalid username");
        require(
            developers[githubUsername].wallet == address(0),
            "Already registered"
        );

        developers[githubUsername] = Developer({
            wallet: msg.sender,
            githubUsername: githubUsername,
            totalEarned: 0
        });

        emit DeveloperRegistered(githubUsername, msg.sender);
    }

    function depositFunds(string calldata repoName, uint256 amount) external {
        Repository storage repo = repositories[repoName];
        require(repo.maintainer == msg.sender, "Not maintainer");
        require(amount > 0, "Invalid amount");

        require(
            pyusd.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        repo.totalFunds += amount;

        emit FundsDeposited(repoName, amount);
    }

    function processPRPayment(
        string calldata repoName,
        string calldata developerGithub,
        uint256 prNumber
    ) external onlyOwner {
        Repository storage repo = repositories[repoName];
        Developer storage dev = developers[developerGithub];

        require(repo.active, "Repository not active");
        require(dev.wallet != address(0), "Developer not registered");
        require(repo.totalFunds >= repo.bountyAmount, "Insufficient funds");

        repo.totalFunds -= repo.bountyAmount;
        dev.totalEarned += repo.bountyAmount;

        payments[paymentCounter] = Payment({
            repoName: repoName,
            developerGithub: developerGithub,
            prNumber: prNumber,
            amount: repo.bountyAmount,
            timestamp: block.timestamp
        });

        require(
            pyusd.transfer(dev.wallet, repo.bountyAmount),
            "Payment failed"
        );

        emit BountyPaid(repoName, developerGithub, prNumber, repo.bountyAmount);
        paymentCounter++;
    }

    function getRepository(
        string calldata repoName
    ) external view returns (Repository memory) {
        return repositories[repoName];
    }

    function getDeveloper(
        string calldata githubUsername
    ) external view returns (Developer memory) {
        return developers[githubUsername];
    }

    function getPayment(uint256 id) external view returns (Payment memory) {
        return payments[id];
    }
}
