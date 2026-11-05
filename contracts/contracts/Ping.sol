// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Day-0 test D5: proves we can deploy and write to 0G Galileo.
contract Ping {
    uint256 public count;
    event Pinged(address indexed from, uint256 count);

    function ping() external {
        count += 1;
        emit Pinged(msg.sender, count);
    }
}
