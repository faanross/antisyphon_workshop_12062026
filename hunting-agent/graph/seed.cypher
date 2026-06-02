MERGE (h:Host {name: "DEV-WS03"})
  SET h.ip = "10.42.10.45", h.os = "Windows 11 Enterprise", h.department = "Platform Engineering", h.criticality = "medium-elevated";
MERGE (u:User {name: "NORTHWIND\\jane.roberts"})
  SET u.role = "Senior Developer", u.department = "Platform Engineering", u.adminGroups = ["CI/CD-Administrators", "Build-Service-Operators"];
MERGE (code:Process {guid: "{DEV-WS03-3104-648f1800}"})
  SET code.name = "Code.exe", code.pid = 3104, code.path = "C:\\Users\\jane.roberts\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe";
MERGE (ps:Process {guid: "{DEV-WS03-7219-648f1980}"})
  SET ps.name = "powershell.exe", ps.pid = 7219, ps.path = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
MERGE (implant:Process {guid: "{DEV-WS03-4832-648f1a2b}"})
  SET implant.name = "svchost-health.exe", implant.pid = 4832, implant.path = "C:\\Users\\jane.roberts\\AppData\\Local\\Temp\\svchost-health.exe";
MERGE (c2:IPAddress {address: "185.225.73.217"})
  SET c2.port = 443, c2.asn = "AS9009", c2.asnName = "M247 Ltd", c2.country = "RO", c2.rarity = 1.0;
MERGE (mega:IPAddress {address: "31.216.144.106"})
  SET mega.port = 443, mega.asn = "AS47846", mega.asnName = "MEGA Limited", mega.country = "NZ", mega.rarity = 0.97;
MERGE (u)-[:USED]->(h);
MERGE (code)-[:RAN_ON]->(h);
MERGE (ps)-[:RAN_ON]->(h);
MERGE (implant)-[:RAN_ON]->(h);
MERGE (code)-[:SPAWNED {timestamp: "2026-03-09T14:00:12.100Z"}]->(ps);
MERGE (ps)-[:SPAWNED {timestamp: "2026-03-09T14:00:28.456Z"}]->(implant);
MERGE (implant)-[:CONNECTED_TO {sessionCount: 361, firstSeen: "2026-03-09T14:00:30Z", lastSeen: "2026-03-09T20:00:00Z"}]->(c2);
MERGE (implant)-[:CONNECTED_TO {sessionCount: 34, firstSeen: "2026-03-09T16:00:00Z", lastSeen: "2026-03-09T16:23:00Z"}]->(mega);
