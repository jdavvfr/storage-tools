# Storage Tools

Free online Storage Tools

RAID calculator.
- RAID Capacity Calculation
- Hot spare sizing
- Rebuild estimation
- Storage efficiency
- TiB / PiB conversion

## Rebuild estimate assumptions

Rebuild durations are per-disk estimates. The optimistic duration is disk capacity divided by the selected disk's nominal rebuild throughput. The realistic duration applies the configured workload percentage, then a domain-contention factor: 0% per member beyond two for RAID 1/10, 8% for each additional member in a RAID 5/50 recovery domain, and 12% for each additional member in RAID 6/60. For RAID 50/60, the recovery domain is one RAID group. The degraded estimate adds 35% to the realistic duration. These are explicit scenario assumptions, not hardware guarantees; controller behavior, rebuild priorities, workload, and read errors can substantially change actual times. RAID 0 has no redundancy, so a failed disk cannot be rebuilt.

Online tool : https://jdavvfr.github.io/storage-tools/
