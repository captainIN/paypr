import {
  BountyPaid as BountyPaidEvent,
  DeveloperRegistered as DeveloperRegisteredEvent,
  FundsDeposited as FundsDepositedEvent,
  RepositoryRegistered as RepositoryRegisteredEvent
} from "../generated/PayPR/PayPR"
import {
  BountyPaid,
  DeveloperRegistered,
  FundsDeposited,
  RepositoryRegistered
} from "../generated/schema"

export function handleBountyPaid(event: BountyPaidEvent): void {
  let entity = new BountyPaid(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.repoName = event.params.repoName.toString().toString()
  entity.developerGithub = event.params.developerGithub.toString()
  entity.prNumber = event.params.prNumber
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeveloperRegistered(
  event: DeveloperRegisteredEvent
): void {
  let entity = new DeveloperRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.githubUsername = event.params.githubUsername.toString()
  entity.wallet = event.params.wallet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFundsDeposited(event: FundsDepositedEvent): void {
  let entity = new FundsDeposited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.repoName = event.params.repoName.toString()
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRepositoryRegistered(
  event: RepositoryRegisteredEvent
): void {
  let entity = new RepositoryRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.repoName = event.params.repoName.toString()
  entity.maintainer = event.params.maintainer
  entity.bountyAmount = event.params.bountyAmount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
