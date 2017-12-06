// adapted from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/expectThrow.js

const INVALID_OPCODE = 'invalid opcode'
const OUT_OF_GAS = 'out of gas'
const REVERT = 'revert'

const assertThrows = async (promise) => {
  try {
    await promise
    assert.fail('Expected throw not received')
  } catch (error) {
    const invalidOpcode = error.message.search(INVALID_OPCODE) >= 0
    const outOfGas = error.message.search(OUT_OF_GAS) >= 0
    const revert = error.message.search(REVERT) >= 0
    assert.isTrue(invalidOpcode || outOfGas || revert, `Expected throw, but got '${error}'`)
  }
}

module.exports = assertThrows
