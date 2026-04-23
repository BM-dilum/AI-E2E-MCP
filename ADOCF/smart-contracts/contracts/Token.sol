// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is ERC20, ERC20Burnable, Ownable {
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event TokenTransferred(address indexed from, address indexed to, uint256 amount);

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Minted(to, amount);
    }

    function burnTokens(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    function transferTokens(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        emit TokenTransferred(msg.sender, to, amount);
        return true;
    }
}