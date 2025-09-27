import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  BountyPaid,
  DeveloperRegistered,
  FundsDeposited,
  RepositoryRegistered
} from "../generated/PayPR/PayPR"

export function createBountyPaidEvent(
  repoName: string,
  developerGithub: string,
  prNumber: BigInt,
  amount: BigInt
): BountyPaid {
  let bountyPaidEvent = changetype<BountyPaid>(newMockEvent())

  bountyPaidEvent.parameters = new Array()

  bountyPaidEvent.parameters.push(
    new ethereum.EventParam("repoName", ethereum.Value.fromString(repoName))
  )
  bountyPaidEvent.parameters.push(
    new ethereum.EventParam(
      "developerGithub",
      ethereum.Value.fromString(developerGithub)
    )
  )
  bountyPaidEvent.parameters.push(
    new ethereum.EventParam(
      "prNumber",
      ethereum.Value.fromUnsignedBigInt(prNumber)
    )
  )
  bountyPaidEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return bountyPaidEvent
}

export function createDeveloperRegisteredEvent(
  githubUsername: string,
  wallet: Address
): DeveloperRegistered {
  let developerRegisteredEvent = changetype<DeveloperRegistered>(newMockEvent())

  developerRegisteredEvent.parameters = new Array()

  developerRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "githubUsername",
      ethereum.Value.fromString(githubUsername)
    )
  )
  developerRegisteredEvent.parameters.push(
    new ethereum.EventParam("wallet", ethereum.Value.fromAddress(wallet))
  )

  return developerRegisteredEvent
}

export function createFundsDepositedEvent(
  repoName: string,
  amount: BigInt
): FundsDeposited {
  let fundsDepositedEvent = changetype<FundsDeposited>(newMockEvent())

  fundsDepositedEvent.parameters = new Array()

  fundsDepositedEvent.parameters.push(
    new ethereum.EventParam("repoName", ethereum.Value.fromString(repoName))
  )
  fundsDepositedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return fundsDepositedEvent
}

export function createRepositoryRegisteredEvent(
  repoName: string,
  maintainer: Address,
  bountyAmount: BigInt
): RepositoryRegistered {
  let repositoryRegisteredEvent =
    changetype<RepositoryRegistered>(newMockEvent())

  repositoryRegisteredEvent.parameters = new Array()

  repositoryRegisteredEvent.parameters.push(
    new ethereum.EventParam("repoName", ethereum.Value.fromString(repoName))
  )
  repositoryRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "maintainer",
      ethereum.Value.fromAddress(maintainer)
    )
  )
  repositoryRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "bountyAmount",
      ethereum.Value.fromUnsignedBigInt(bountyAmount)
    )
  )

  return repositoryRegisteredEvent
}
