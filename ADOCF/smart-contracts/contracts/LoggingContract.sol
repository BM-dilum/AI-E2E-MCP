pragma solidity ^0.8.28;

contract LoggingContract {
    address public owner;

    struct ToolCall {
        bytes32 nameHash;
        bytes32 argsHash;
        bytes32 resultHash;
    }

    struct LogEntry {
        bytes32 userRequestHash;
        bytes32 responseHash;
        ToolCall[] toolCalls;
    }

    struct SessionDataEntry {
        LogEntry[] logs;
        string txHash;
        bool exists;
        address authorizedWriter;
    }

    mapping(string => SessionDataEntry) private sessionData;
    string[] private sessionIDs;

    uint256 public constant DEFAULT_PAGE_SIZE = 10;

    event LogsUploaded(string indexed sessionID, bytes32 logsHash, string txHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlySessionWriter(string memory sessionID) {
        SessionDataEntry storage entry = sessionData[sessionID];
        require(entry.exists, "Session does not exist");
        require(msg.sender == owner || msg.sender == entry.authorizedWriter, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setSessionWriter(string memory sessionID, address writer) external onlyOwner {
        SessionDataEntry storage entry = sessionData[sessionID];
        require(entry.exists, "Session does not exist");
        entry.authorizedWriter = writer;
    }

    function uploadLogs(
        string memory sessionID,
        LogEntry[] memory logEntries,
        string memory txHash
    ) external {
        SessionDataEntry storage entry = sessionData[sessionID];

        if (!entry.exists) {
            entry.exists = true;
            sessionIDs.push(sessionID);
        }

        require(msg.sender == owner || msg.sender == entry.authorizedWriter || entry.authorizedWriter == address(0), "Not authorized");

        delete entry.logs;

        bytes32 logsHash = keccak256(abi.encode(logEntries));

        for (uint256 i = 0; i < logEntries.length; i++) {
            LogEntry memory logEntry = logEntries[i];
            entry.logs.push();

            LogEntry storage storedLog = entry.logs[entry.logs.length - 1];
            storedLog.userRequestHash = logEntry.userRequestHash;
            storedLog.responseHash = logEntry.responseHash;

            for (uint256 j = 0; j < logEntry.toolCalls.length; j++) {
                ToolCall memory toolCall = logEntry.toolCalls[j];
                storedLog.toolCalls.push(ToolCall({
                    nameHash: toolCall.nameHash,
                    argsHash: toolCall.argsHash,
                    resultHash: toolCall.resultHash
                }));
            }
        }

        entry.txHash = txHash;

        emit LogsUploaded(sessionID, logsHash, txHash);
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

        totalPages = (totalSessions + effectivePageSize - 1) / effectivePageSize;

        if (page == 0 || page > totalPages) {
            return (new SessionDataEntry[](0), totalPages);
        }

        uint256 startIndex = totalSessions - (page - 1) * effectivePageSize;
        uint256 endIndex = startIndex > effectivePageSize ? startIndex - effectivePageSize : 0;
        uint256 resultLength = startIndex - endIndex;

        SessionDataEntry[] memory results = new SessionDataEntry[](resultLength);
        uint256 resultIndex = 0;

        for (uint256 i = startIndex; i > endIndex; i--) {
            string memory sessionID = sessionIDs[i - 1];
            SessionDataEntry storage storedEntry = sessionData[sessionID];

            SessionDataEntry memory copiedEntry;
            copiedEntry.txHash = storedEntry.txHash;
            copiedEntry.exists = storedEntry.exists;
            copiedEntry.authorizedWriter = storedEntry.authorizedWriter;
            copiedEntry.logs = new LogEntry[](storedEntry.logs.length);

            for (uint256 j = 0; j < storedEntry.logs.length; j++) {
                LogEntry storage storedLog = storedEntry.logs[j];
                LogEntry memory copiedLog;
                copiedLog.userRequestHash = storedLog.userRequestHash;
                copiedLog.responseHash = storedLog.responseHash;
                copiedLog.toolCalls = new ToolCall[](storedLog.toolCalls.length);

                for (uint256 k = 0; k < storedLog.toolCalls.length; k++) {
                    ToolCall storage storedToolCall = storedLog.toolCalls[k];
                    copiedLog.toolCalls[k] = ToolCall({
                        nameHash: storedToolCall.nameHash,
                        argsHash: storedToolCall.argsHash,
                        resultHash: storedToolCall.resultHash
                    });
                }

                copiedEntry.logs[j] = copiedLog;
            }

            results[resultIndex] = copiedEntry;
            resultIndex++;
        }

        return (results, totalPages);
    }

    function getSessionIDs() external view onlyOwner returns (string[] memory) {
        return sessionIDs;
    }
}