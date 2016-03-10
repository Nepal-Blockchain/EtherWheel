contract Spinner {
    address public host;
    uint public goal;
    uint public increment;
    mapping(address => uint) public stakes;
    address[] public stakeholders;

    struct Win {
        address winner;
        uint timestamp;
        uint stake;
    }

    Win[] public recentWins;
    uint recentWinsCount;

    event Won(address winner, uint timestamp, uint stake);
    event ChangedStake(address stakeholder);

    function Spinner(uint _goalInFinney, uint _incrementInFinney, uint8 _recentWinsCount) {
        if(_goalInFinney % _incrementInFinney != 0) throw;

        host = msg.sender;
        goal = _goalInFinney * 1 finney;
        increment = _incrementInFinney * 1 finney;
        recentWinsCount = _recentWinsCount;
    }

    function() {
        buyStake(true);
    }

    function buyStake(bool rejectPartialBets) {
        // First, make sure this is a valid transaction.
        // Otherwise the account needs to be refunded.
        if(msg.value == 0 || msg.value % increment != 0) throw;
        if(rejectPartialBets && (this.balance > goal)) throw;

        if(stakes[msg.sender] == 0) {
            // This account doesn't already own any stake.
            stakeholders.push(msg.sender);
        }

        uint stake = msg.value;
        if(this.balance > goal) {
            // We were paid too much and the goal was overshot.
            // Send the remainder back to the account.
            uint refund = goal - this.balance;
            stake = msg.value - refund;
            msg.sender.send(refund);
        }
        stakes[msg.sender] += stake;
        ChangedStake(msg.sender);

        if(this.balance == goal) {
            // Woohoo, the spinner has been filled! Choose a winner.
            address winner = selectWinner();

            // Send the developer a 1% coffee tip. wink emoticon
            host.send(this.balance / 100);

            // Send the winner the remaining balance on the contract.
            winner.send(this.balance);

            // Make a note that someone won, then start all over!
            recordWin(winner);
            Won(winner, block.timestamp, stakes[winner]);
            reset();
        }
    }

    /* Refunds are allowed at any time before a winner is chosen. */
    function refundStake() {
        if(stakes[msg.sender] == 0 || msg.value > 0) throw;

        for(uint i = 0; i < stakeholders.length; ++i) {
            if(stakeholders[i] == msg.sender) {
                delete stakeholders[i];
                break;
            }
        }

        msg.sender.send(stakes[msg.sender]);
        stakes[msg.sender] = 0;
        ChangedStake(msg.sender);
    }

    /* This should only be needed if a bug is discovered
    in the code and the contract must be destroyed. */
    function destroy() {
        if(msg.sender != host) throw;

        for(uint i = 0; i < stakeholders.length; ++i) {
            stakeholders[i].send(stakes[stakeholders[i]]);
        }

        selfdestruct(host);
    }

    function selectWinner() internal returns (address winner) {
        /* Note that the block hash of the last block is used to determine
        a pseudo-random winner. Since this could possibly be manipulated
        by miners, spinner goals should remain at 5 ether or less to
        eliminate the incentive to cheat, since therwise cheating the system
        would result in a net loss for the cheating miner. */

        uint semirandom = uint(block.blockhash(block.number - 1)) % this.balance;
        for(uint i = 0; i < stakeholders.length; ++i) {
            if(semirandom < stakes[stakeholders[i]]) return stakeholders[i];
            semirandom -= stakes[stakeholders[i]];
        }
    }

    function recordWin(address winner) internal {
        if(recentWins.length < recentWinsCount) {
            recentWins.length++;
        } else {
            // Already at capacity for the number of winners to remember.
            // Forget the oldest one by shifting each entry 'left'
            for(uint i = 0; i < recentWinsCount - 1; ++i) {
                recentWins[i] = recentWins[i + 1];
            }
        }

        recentWins[recentWins.length - 1] = Win(winner, block.timestamp, stakes[winner]);
    }

    function reset() internal {
        // Return the stakeholders' funds, since this spinner is ending early.
        for(uint i = 0; i < stakeholders.length; ++i) {
            delete stakes[stakeholders[i]];
        }

        delete stakeholders;
    }
}
