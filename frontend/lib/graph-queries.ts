import { gql } from '@apollo/client';

export const GET_DEVELOPER_LEADERBOARD = gql`
  query GetDeveloperLeaderboard {
    developerRegistereds(first: 10, orderBy: blockTimestamp, orderDirection: desc) {
      id
      githubUsername
      wallet
      blockTimestamp
    }
  }
`;

export const GET_PAYMENT_HISTORY = gql`
  query GetPaymentHistory($first: Int = 20) {
    bountyPaids(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      repoName
      developerGithub
      prNumber
      amount
      blockTimestamp
      transactionHash
    }
  }
`;

export const GET_REPOSITORY_STATS = gql`
  query GetRepositoryStats {
    repositoryRegistereds(first: 10, orderBy: blockTimestamp, orderDirection: desc) {
      id
      repoName
      maintainer
      bountyAmount
      blockTimestamp
    }
  }
`;

export const GET_FUNDS_DEPOSITED = gql`
  query GetFundsDeposited {
    fundsDepositeds(first: 10, orderBy: blockTimestamp, orderDirection: desc) {
      id
      repoName
      amount
      blockTimestamp
    }
  }
`;

export const GET_ANALYTICS_OVERVIEW = gql`
  query GetAnalyticsOverview {
    bountyPaids(first: 1000) {
      amount
    }
    developerRegistereds {
      id
    }
    repositoryRegistereds {
      id
    }
  }
`;