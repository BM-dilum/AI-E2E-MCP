pragma solidity ^0.8.28;

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
        LogEntry[] logs;
        string txHash;
        address owner;
    }

    struct SessionMetadata {
        string sessionID;
        string txHash;
        address owner;
        uint256 logCount;
    }

    mapping(string => SessionDataEntry) private sessionData;
    string[] private sessionIDs;

    uint256 public constant DEFAULT_PAGE_SIZE = 10;
    uint256 public constant DEFAULT_LOG_PAGE_SIZE = 5;

    event LogsUploaded(string indexed sessionID, address indexed owner, uint256 logCount, string txHash);

    modifier onlySessionOwner(string memory sessionID) {
        SessionDataEntry storage entry = sessionData[sessionID];
        require(entry.owner == msg.sender, "Not session owner");
        _;
    }

    function uploadLogs(
        string memory sessionID,
        LogEntry[] memory logEntries,
        string memory txHash
    ) external {
        SessionDataEntry storage entry = sessionData[sessionID];
        bool isNewSession = entry.owner == address(0);

        if (isNewSession) {
            entry.owner = msg.sender;
            sessionIDs.push(sessionID);
        } else {
            require(entry.owner == msg.sender, "Not session owner");
            delete entry.logs;
        }

        for (uint256 i = 0; i < logEntries.length; i++) {
            LogEntry memory sourceLog = logEntries[i];
            ToolCall[] memory sourceToolCalls = sourceLog.toolCalls;

            entry.logs.push();
            LogEntry storage storedLog = entry.logs[entry.logs.length - 1];
            storedLog.userRequest = sourceLog.userRequest;
            storedLog.response = sourceLog.response;

            for (uint256 j = 0; j < sourceToolCalls.length; j++) {
                ToolCall memory sourceToolCall = sourceToolCalls[j];
                storedLog.toolCalls.push(
                    ToolCall({
                        name: sourceToolCall.name,
                        args: sourceToolCall.args,
                        result: sourceToolCall.result
                    })
                );
            }
        }

        entry.txHash = txHash;

        emit LogsUploaded(sessionID, msg.sender, logEntries.length, txHash);
    }

    function getLogs(uint256 page, uint256 pageSize)
        external
        view
        returns (SessionMetadata[] memory, uint256 totalPages)
    {
        uint256 effectivePageSize = pageSize == 0 ? DEFAULT_PAGE_SIZE : pageSize;
        uint256 totalSessions = sessionIDs.length;

        if (totalSessions == 0) {
            return (new SessionMetadata[](0), 0);
        }

        totalPages = (totalSessions + effectivePageSize - 1) / effectivePageSize;

        if (page == 0 || page > totalPages) {
            return (new SessionMetadata[](0), totalPages);
        }

        uint256 startIndex = totalSessions - ((page - 1) * effectivePageSize);
        uint256 endIndexExclusive = startIndex > effectivePageSize ? startIndex - effectivePageSize : 0;
        uint256 resultLength = startIndex - endIndexExclusive;

        SessionMetadata[] memory results = new SessionMetadata[](resultLength);

        uint256 resultIndex = 0;
        for (uint256 i = startIndex; i > endIndexExclusive; i--) {
            string memory sessionID = sessionIDs[i - 1];
            SessionDataEntry storage storedEntry = sessionData[sessionID];

            results[resultIndex] = SessionMetadata({
                sessionID: sessionID,
                txHash: storedEntry.txHash,
                owner: storedEntry.owner,
                logCount: storedEntry.logs.length
            });

            resultIndex++;
        }

        return (results, totalPages);
    }

    function getSessionLogs(
        string memory sessionID,
        uint256 page,
        uint256 pageSize
    ) external view returns (LogEntry[] memory, uint256 totalPages) {
        SessionDataEntry storage storedEntry = sessionData[sessionID];
        uint256 totalLogs = storedEntry.logs.length;
        uint256 effectivePageSize = pageSize == 0 ? DEFAULT_LOG_PAGE_SIZE : pageSize;

        if (totalLogs == 0) {
            return (new LogEntry[](0), 0);
        }

        totalPages = (totalLogs + effectivePageSize - 1) / effectivePageSize;

        if (page == 0 || page > totalPages) {
            return (new LogEntry[](0), totalPages);
        }

        uint256 startIndex = totalLogs - ((page - 1) * effectivePageSize);
        uint256 endIndexExclusive = startIndex > effectivePageSize ? startIndex - effectivePageSize : 0;
        uint256 resultLength = startIndex - endIndexExclusive;

        LogEntry[] memory results = new LogEntry[](resultLength);

        uint256 resultIndex = 0;
        for (uint256 i = startIndex; i > endIndexExclusive; i--) {
            LogEntry storage storedLog = storedEntry.logs[i - 1];
            LogEntry memory copiedLog;
            copiedLog.userRequest = storedLog.userRequest;
            copiedLog.response = storedLog.response;
            copiedLog.toolCalls = new ToolCall[](storedLog.toolCalls.length);

            for (uint256 j = 0; j < storedLog.toolCalls.length; j++) {
                ToolCall storage storedToolCall = storedLog.toolCalls[j];
                copiedLog.toolCalls[j] = ToolCall({
                    name: storedToolCall.name,
                    args: storedToolCall.args,
                    result: storedToolCall.result
                });
            }

            results[resultIndex] = copiedLog;
            resultIndex++;
        }

        return (results, totalPages);
    }

    function getSessionIDs() external view returns (string[] memory) {
        return sessionIDs;
    }
}