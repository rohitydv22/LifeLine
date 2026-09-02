/**
 * LifeLine AIOps — Structured Multi-Tier Network Root Cause Analysis (RCA) Engine
 * 
 * Performs evidence-backed diagnostic checklist evaluation on simulation telemetry:
 * 1. Student Device Link & Association Status
 * 2. Target Access Point Reachability & Radio Beacon
 * 3. Nearby Access Points Status (Multi-AP Correlation)
 * 4. Hostel Distribution Switch Reachability & Port Status
 * 5. Campus Core Router & Gateway Route
 * 6. External Internet & DNS Connectivity
 */

(function (global) {
  "use strict";

  class NetworkRCAEngine {
    /**
     * Conducts a structured 6-tier diagnostic probe evaluation
     * @param {Object} simulator - CampusNetworkSimulator instance or snapshot
     * @param {string} targetLocation - Room or AP ID (e.g. "Hostel A - Room 306" or "AP-306")
     */
    static investigate(simulator, targetLocation = "AP-306") {
      let snapshot = null;
      if (simulator && typeof simulator.getStatusSnapshot === "function") {
        snapshot = simulator.getStatusSnapshot();
      } else if (simulator && simulator.accessPoints) {
        snapshot = simulator;
      } else {
        throw new Error("Invalid simulator or state snapshot passed to NetworkRCAEngine");
      }

      // Determine target AP ID
      let targetApId = "AP-306";
      if (targetLocation.includes("307") || targetLocation === "AP-307") targetApId = "AP-307";
      else if (targetLocation.includes("308") || targetLocation.includes("Lounge") || targetLocation === "AP-308") targetApId = "AP-308";

      const targetAp = snapshot.accessPoints[targetApId] || snapshot.accessPoints["AP-306"];
      const router = snapshot.router;
      const sw = snapshot.switch;
      const internet = snapshot.internet;

      // 1. Evaluate Student Device Connectivity in target zone
      const zoneDevices = Object.values(snapshot.devices).filter(d => d.associatedAp === targetAp.id);
      const connectedCount = zoneDevices.filter(d => d.status === "connected").length;
      const deviceCheck = {
        checkNumber: 1,
        title: "Student Device Association",
        description: `Check 802.11 link status for ${zoneDevices.length} devices assigned to ${targetAp.id}`,
        status: connectedCount > 0 ? "HEALTHY" : "DISCONNECTED",
        passed: connectedCount > 0,
        evidence: `${connectedCount}/${zoneDevices.length} student devices associated (RSSI avg: ${connectedCount > 0 ? '-51dBm' : 'N/A'})`
      };

      // 2. Evaluate Target Access Point Reachability
      const apCheck = {
        checkNumber: 2,
        title: `${targetAp.id} (${targetAp.location}) Reachability`,
        description: `Ping probe and SNMP heartbeat to AP at ${targetAp.ip}`,
        status: targetAp.status.toUpperCase(),
        passed: targetAp.status === "healthy",
        evidence: targetAp.status === "healthy" 
          ? `AP responding on ${targetAp.ip} (PoE: ${targetAp.poeWatts}W, Ch: ${targetAp.channel})`
          : `AP unresponsive on ${targetAp.ip} — Zero radio beacon output on 5GHz BSSID ${targetAp.bssid}`
      };

      // 3. Evaluate Nearby Access Points
      const otherAps = Object.values(snapshot.accessPoints).filter(a => a.id !== targetAp.id);
      const healthyOtherCount = otherAps.filter(a => a.status === "healthy").length;
      const nearbyStatus = healthyOtherCount === otherAps.length ? "HEALTHY" : (healthyOtherCount === 0 ? "OFFLINE" : "DEGRADED");
      const nearbyCheck = {
        checkNumber: 3,
        title: "Nearby Access Points Correlation",
        description: `Check health of adjacent APs in Hostel A (${otherAps.map(a => a.id).join(", ")})`,
        status: nearbyStatus,
        passed: healthyOtherCount === otherAps.length,
        evidence: `${healthyOtherCount}/${otherAps.length} nearby APs operating normally (${otherAps.map(a => `${a.id}: ${a.status.toUpperCase()}`).join(", ")})`
      };

      // 4. Evaluate Hostel Switch Status
      const switchCheck = {
        checkNumber: 4,
        title: `Hostel Switch (${sw.id}) Integrity`,
        description: `Layer 2/3 ping and PoE controller state on ${sw.ip}`,
        status: sw.status.toUpperCase(),
        passed: sw.status === "healthy",
        evidence: sw.status === "healthy"
          ? `Switch ${sw.id} online, STP ${sw.stpState}, PoE load ${sw.poeUsageWatts}W/${sw.poeBudgetWatts}W`
          : `Switch ${sw.id} unreachable — Loss of telemetry heartbeat on VLAN ${sw.vlan}`
      };

      // 5. Evaluate Campus Core Router Status
      const routerCheck = {
        checkNumber: 5,
        title: `Campus Core Router (${router.id}) Status`,
        description: `Campus core routing table and gateway reachability at ${router.ip}`,
        status: router.status.toUpperCase(),
        passed: router.status === "healthy",
        evidence: router.status === "healthy"
          ? `Core Router ${router.id} active, BGP ${router.bgpState}, Gateway ${router.ip} reachable`
          : `Core Router ${router.id} offline — BGP session lost, default gateway dropped`
      };

      // 6. Evaluate External Internet Connectivity
      const internetCheck = {
        checkNumber: 6,
        title: "External Internet Gateway & DNS Reachability",
        description: "ICMP ping to 8.8.8.8 and public DNS resolution",
        status: (router.status === "healthy" && internet.status === "healthy") ? "HEALTHY" : "UNREACHABLE",
        passed: router.status === "healthy" && internet.status === "healthy",
        evidence: (router.status === "healthy" && internet.status === "healthy")
          ? `External ping to 8.8.8.8 successful (RTT: ${internet.pingLatencyMs}ms)`
          : "External ping to 8.8.8.8 failed (100% packet loss)"
      };

      const checklist = [
        deviceCheck,
        apCheck,
        nearbyCheck,
        switchCheck,
        routerCheck,
        internetCheck
      ];

      // Evidence-based Root Cause Deduction
      let likelyRootCause = "Normal Network Operations";
      let failureScope = "None";
      let affectedHeadcount = 0;
      let recommendedRecoveryAction = "No action required; network path is healthy.";
      let rcaCategory = "healthy";

      if (router.status !== "healthy") {
        likelyRootCause = "Campus Core Gateway Failure";
        failureScope = "Campus-Wide";
        affectedHeadcount = 7500;
        recommendedRecoveryAction = "Trigger core router interface restart and initiate BGP route failover to secondary edge ISP link.";
        rcaCategory = "campus_router";
      } else if (sw.status !== "healthy") {
        likelyRootCause = "Hostel Distribution Switch Failure";
        failureScope = "Building/Hostel-Wide (Hostel A)";
        affectedHeadcount = 450;
        recommendedRecoveryAction = "Power-cycle distribution switch SW-HostelA via remote PDU, reset PoE budget, and verify trunk interface.";
        rcaCategory = "hostel_switch";
      } else if (targetAp.status !== "healthy") {
        if (nearbyStatus === "HEALTHY") {
          likelyRootCause = "Local Access Point Failure";
          failureScope = `Localized (${targetAp.location})`;
          affectedHeadcount = 4;
          recommendedRecoveryAction = `Restart ${targetAp.id}, clear stale DHCP lease bindings, and cycle 5GHz radio channel.`;
          rcaCategory = "local_ap";
        } else {
          likelyRootCause = "Multi-AP Wing Power/PoE Fault";
          failureScope = "Hostel Wing";
          affectedHeadcount = 60;
          recommendedRecoveryAction = "Inspect PoE power allocation on floor distribution switch and re-provision AP cluster.";
          rcaCategory = "hostel_wing";
        }
      } else if (connectedCount === 0) {
        likelyRootCause = "Client-Side Wi-Fi Authentication or Device Adapter Error";
        failureScope = "Single Device";
        affectedHeadcount = 1;
        recommendedRecoveryAction = "Prompt student to forget SSID 'LifeLine-HostelA-FastWifi' and re-authenticate 802.1X credentials.";
        rcaCategory = "client_device";
      }

      return {
        timestamp: new Date().toISOString(),
        targetLocation: targetAp.location,
        targetApId: targetAp.id,
        summary: {
          roomAccessPointStatus: targetAp.status.toUpperCase(),
          nearbyAccessPointsStatus: nearbyStatus,
          hostelNetworkStatus: sw.status.toUpperCase(),
          campusNetworkStatus: router.status.toUpperCase(),
          internetStatus: internetCheck.status
        },
        checklist,
        likelyRootCause,
        failureScope,
        affectedHeadcount,
        recommendedRecoveryAction,
        rcaCategory,
        isActionable: rcaCategory !== "healthy" && rcaCategory !== "client_device"
      };
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { NetworkRCAEngine };
  }
  if (typeof window !== "undefined") {
    window.NetworkRCAEngine = NetworkRCAEngine;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
