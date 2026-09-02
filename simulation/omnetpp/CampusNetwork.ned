//
// LifeLine AIOps — Campus Wi-Fi & Network Topology Definition
// OMNeT++ 6.0 / INET Framework 4.5 Network Description (NED)
// 
// Represents the campus hierarchy:
// Student Devices (802.11ac Wireless Hosts)
//        │
//        │ Wi-Fi Wireless Channel
//        ▼
// Wi-Fi Access Points (AP-306, AP-307, AP-308)
//        │
//        │ 1000Base-T Ethernet + PoE
//        ▼
// Hostel Distribution Switch (SW-HostelA)
//        │
//        │ 10Gbps SFP+ Fiber Uplink
//        ▼
// Campus Core Router (Router-CampusCore)
//        │
//        │ Campus Gateway & BGP Route
//        ▼
// External Network / Internet Server (8.8.8.8)
//

package lifeline.simulation.omnetpp;

import inet.node.inet.Router;
import inet.node.inet.StandardHost;
import inet.node.ethernet.EthernetSwitch;
import inet.node.wireless.AccessPoint;
import inet.node.wireless.WirelessHost;
import inet.physicallayer.wireless.common.medium.RadioMedium;
import ned.DatarateChannel;

// ----------------------------------------------------------------------------
// Channel Definitions
// ----------------------------------------------------------------------------
channel Eth100M extends DatarateChannel
{
    datarate = 100Mbps;
    delay = 0.5ms;
    ber = 1e-9;
}

channel GigabitEth extends DatarateChannel
{
    datarate = 1000Mbps;
    delay = 0.1ms;
    ber = 1e-10;
}

channel TenGigFiber extends DatarateChannel
{
    datarate = 10000Mbps;
    delay = 0.05ms;
    ber = 1e-12;
}

// ----------------------------------------------------------------------------
// Compound Network Module: CampusNetwork
// ----------------------------------------------------------------------------
network CampusNetwork
{
    parameters:
        @display("bgb=1000,700;bgi=maps/campus_grid,s");
        int numStudentsHostelA = default(6);
        string campusLocation = default("Hostel A Complex - West Wing");
        double packetLossRate = default(0.0);
        bool faultAP306 = default(false);
        bool faultHostelSwitch = default(false);
        bool faultCampusRouter = default(false);

    submodules:
        // Physical Wireless Radio Medium (802.11ac / 5GHz)
        radioMedium: RadioMedium {
            @display("p=100,50;is=s");
        }

        // External Internet Server / Cloud Gateway
        internetServer: StandardHost {
            @display("p=500,80;i=device/server;is=vl;t=Internet Gateway / DNS (8.8.8.8)");
        }

        // Campus Core Routing Engine
        campusRouter: Router {
            @display("p=500,200;i=device/router;is=l;t=Router-CampusCore (10.0.0.1)");
        }

        // Hostel A Main Distribution Switch (Layer 2/3 PoE Switch)
        hostelSwitch: EthernetSwitch {
            @display("p=500,340;i=device/switch;is=l;t=SW-HostelA (Cisco Catalyst 3850)");
        }

        // Access Point in Room 306 (AP-306)
        ap306: AccessPoint {
            @display("p=280,480;i=device/accesspoint;is=m;t=AP-306 (Hostel A Room 306)");
        }

        // Access Point in Room 307 (AP-307)
        ap307: AccessPoint {
            @display("p=500,480;i=device/accesspoint;is=m;t=AP-307 (Hostel A Room 307)");
        }

        // Access Point in Lounge / Corridor (AP-308)
        ap308: AccessPoint {
            @display("p=720,480;i=device/accesspoint;is=m;t=AP-308 (Hostel A Floor 3 Lounge)");
        }

        // Student Wireless Devices in Room 306
        student306_Laptop: WirelessHost {
            @display("p=220,620;i=device/laptop;t=Student-306A Laptop (10.10.3.101)");
        }

        student306_Phone: WirelessHost {
            @display("p=310,620;i=device/pocketpc;t=Student-306B Mobile (10.10.3.102)");
        }

        // Student Wireless Devices in Room 307
        student307_Laptop: WirelessHost {
            @display("p=460,620;i=device/laptop;t=Student-307A Laptop (10.10.3.103)");
        }

        student307_Tablet: WirelessHost {
            @display("p=540,620;i=device/palm;t=Student-307B Tablet (10.10.3.104)");
        }

        // Student Wireless Devices in Lounge / AP-308
        student308_Laptop: WirelessHost {
            @display("p=680,620;i=device/laptop;t=Student-308A Laptop (10.10.3.105)");
        }

        student308_Phone: WirelessHost {
            @display("p=770,620;i=device/pocketpc;t=Student-308B Mobile (10.10.3.106)");
        }

    connections allowunconnected:
        // Internet Uplink: Core Router <---> Internet Server (10G Fiber)
        campusRouter.ethg++ <--> TenGigFiber <--> internetServer.ethg++;

        // Campus Backbone: Hostel Switch <---> Campus Router (1G Ethernet Trunk)
        hostelSwitch.ethg++ <--> GigabitEth <--> campusRouter.ethg++;

        // Access Point Backhaul Links (PoE Gigabit Ethernet)
        ap306.ethg++ <--> GigabitEth <--> hostelSwitch.ethg++;
        ap307.ethg++ <--> GigabitEth <--> hostelSwitch.ethg++;
        ap308.ethg++ <--> GigabitEth <--> hostelSwitch.ethg++;

        // Wireless connections managed dynamically via INET 802.11 radioMedium
}
