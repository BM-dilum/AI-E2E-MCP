// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract LoggingContract {
    struct ToolCall {
        string name;
        string args;
        string result;
    }

    struct LogEntry {
        string userRequest;
        string response;
        ToolCall[] toolCalls;
    }

    struct SessionDataEntry {
        string sessionID;
        LogEntry[] logs;
        string txHash;
    }

    mapping(string => SessionDataEntry) private sessionData;
    mapping(string => address) private sessionOwners;
    string[] private sessionIDs;

    uint256 public constant DEFAULT_PAGE_SIZE = 10;

    event LogsUploaded(string indexed sessionID, LogEntry[] logEntries, string txHash);

    function uploadLogs(
        string memory sessionID,
        LogEntry[] memory logEntries,
        string memory txHash
    ) external {
        require(bytes(sessionID).length > 0, "sessionID cannot be empty");

        SessionDataEntry storage entry = sessionData[sessionID];
        address owner = sessionOwners[sessionID];

        if (owner == address(0)) {
            sessionOwners[sessionID] = msg.sender;
            sessionIDs.push(sessionID);
        } else {
            require(owner == msg.sender, "Not session owner");
        }

        entry.sessionID = sessionID;
        delete entry.logs;

        for (uint256 i = 0; i < logEntries.length; i++) {
            LogEntry storage storedLog = entry.logs.push();
            storedLog.userRequest = logEntries[i].userRequest;
            storedLog.response = logEntries[i].response;

            for (uint256 j = 0; j < logEntries[i].toolCalls.length; j++) {
                ToolCall storage storedToolCall = storedLog.toolCalls.push();
                storedToolCall.name = logEntries[i].toolCalls[j].name;
                storedToolCall.args = logEntries[i].toolCalls[j].args;
                storedToolCall.result = logEntries[i].toolCalls[j].result;
            }
        }

        entry.txHash = txHash;

        emit LogsUploaded(sessionID, logEntries, txHash);
    }

    function getLogs(uint256 page, uint256 pageSize)
        external
        view
        returns (SessionDataEntry[] memory, uint256 totalPages)
    {
        uint256 effectivePageSize = pageSize == 0 ? DEFAULT_PAGE_SIZE : pageSize;
        uint256 totalSessions = sessionIDs.length;

        if (totalSessions == 0) {
            return (new SessionDataEntry[](0), 0);
        }

        totalPages = (totalSessions - 1) / effectivePageSize + 1;

        if (page == 0 || page > totalPages) {
            return (new SessionDataEntry[](0), totalPages);
        }

        uint256 startIndex = totalSessions - ((page - 1) * effectivePageSize);
        uint256 endIndex = startIndex > effectivePageSize ? startIndex - effectivePageSize : 0;
        uint256 resultLength = startIndex - endIndex;

        SessionDataEntry[] memory results = new SessionDataEntry[](resultLength);
        uint256 resultIndex = 0;

        for (uint256 i = startIndex; i > endIndex; i--) {
            string memory sessionID = sessionIDs[i - 1];
            SessionDataEntry storage storedEntry = sessionData[sessionID];

            SessionDataEntry memory copiedEntry;
            copiedEntry.sessionID = storedEntry.sessionID;
            copiedEntry.txHash = storedEntry.txHash;
            copiedEntry.logs = new LogEntry[](storedEntry.logs.length);

            for (uint256 j = 0; j < storedEntry.logs.length; j++) {
                copiedEntry.logs[j].userRequest = storedEntry.logs[j].userRequest;
                copiedEntry.logs[j].response = storedEntry.logs[j].response;
                copiedEntry.logs[j].toolCalls = new ToolCall[](storedEntry.logs[j].toolCalls.length);

                for (uint256 k = 0; k < storedEntry.logs[j].toolCalls.length; k++) {
                    copiedEntry.logs[j].toolCalls[k].name = storedEntry.logs[j].toolCalls[k].name;
                    copiedEntry.logs[j].toolCalls[k].args = storedEntry.logs[j].toolCalls[k].args;
                    copiedEntry.logs[j].toolCalls[k].result = storedEntry.logs[j].toolCalls[k].result;
                }
            }

            results[resultIndex] = copiedEntry;
            resultIndex++;
        }

        return (results, totalPages);
    }

    function getSessionIDs() external view returns (string[] memory) {
        return sessionIDs;
    }
}