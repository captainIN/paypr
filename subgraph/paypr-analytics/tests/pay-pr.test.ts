import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address } from "@graphprotocol/graph-ts"
import { BountyPaid } from "../generated/schema"
import { BountyPaid as BountyPaidEvent } from "../generated/PayPR/PayPR"
import { handleBountyPaid } from "../src/pay-pr"
import { createBountyPaidEvent } from "./pay-pr-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let repoName = "Example string value"
    let developerGithub = "Example string value"
    let prNumber = BigInt.fromI32(234)
    let amount = BigInt.fromI32(234)
    let newBountyPaidEvent = createBountyPaidEvent(
      repoName,
      developerGithub,
      prNumber,
      amount
    )
    handleBountyPaid(newBountyPaidEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("BountyPaid created and stored", () => {
    assert.entityCount("BountyPaid", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "BountyPaid",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "repoName",
      "Example string value"
    )
    assert.fieldEquals(
      "BountyPaid",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "developerGithub",
      "Example string value"
    )
    assert.fieldEquals(
      "BountyPaid",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "prNumber",
      "234"
    )
    assert.fieldEquals(
      "BountyPaid",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amount",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
