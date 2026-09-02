//
// LifeLine AIOps — Campus Wi-Fi Simulation Message Definitions
// OMNeT++ 6.0 / INET Framework 4.5 (.msg)
//

import inet.common.INETDefs;
import inet.common.packet.chunk.Chunk;

namespace lifeline::simulation::omnetpp;

enum ComponentStatusType
{
    STATUS_HEALTHY = 0;
    STATUS_DEGRADED = 1;
    STATUS_OFFLINE = 2;
    STATUS_RECOVERING = 3;
};

enum FaultScenarioType
{
    FAULT_NONE = 0;
    FAULT_SINGLE_AP_306 = 1;
    FAULT_HOSTEL_SWITCH = 2;
    FAULT_CAMPUS_ROUTER = 3;
    FAULT_DHCP_EXHAUSTION = 4;
};

//
// Periodic Wi-Fi Probe Ping packet
//
class NetworkProbePing extends inet::FieldsChunk
{
    int sequenceNumber;
    simtime_t sentTimestamp;
    string sourceNode;
    string destinationNode;
    string accessPointBssid;
    double rssiDbm = -50.0;
    bool packetDropped = false;
}

//
// Periodic Access Point Health Beacon
//
class ApHealthBeacon extends inet::FieldsChunk
{
    string apId;
    string location;
    int status = STATUS_HEALTHY;
    int associatedClientCount;
    int channel;
    double cpuUtilizationPct;
    double memoryUtilizationPct;
    simtime_t uptime;
}

//
// Injected Network Fault Signal
//
class FaultInjectionSignal extends inet::FieldsChunk
{
    int scenario = FAULT_NONE;
    string targetComponentId;
    string faultReason;
    simtime_t injectedAt;
    double simulatedDurationSec;
}

//
// Telemetry Aggregation Report
//
class TelemetryReportMessage extends inet::FieldsChunk
{
    simtime_t timestamp;
    string location;
    string targetApId;
    int targetApStatus = STATUS_HEALTHY;
    int nearbyApStatus = STATUS_HEALTHY;
    int hostelNetworkStatus = STATUS_HEALTHY;
    int campusNetworkStatus = STATUS_HEALTHY;
    double packetLossPct = 0.0;
    double averageLatencyMs = 12.5;
    string reachability = "REACHABLE";
}

//
// Recovery Command Signal
//
class RecoveryCommandMessage extends inet::FieldsChunk
{
    string targetComponentId;
    string proposedAction;
    bool isDryRunSandbox = false;
    simtime_t triggeredAt;
}
