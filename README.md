# Storage Tools

Free online storage tools for capacity planning.

## Available tools

- RAID calculator: usable capacity, hot spare sizing, rebuild estimates, storage efficiency, and RAID-level comparisons.
- To / TiB converter: bidirectional conversion between decimal terabytes (To) and binary tebibytes (TiB). It accepts a comma or point as the decimal separator.
- Copy duration estimator: estimates transfer time from a data volume and throughput, with decimal and binary byte units as well as decimal bit rates.

The converter uses the same capacity convention as the RAID calculator: 1 To = 1,000,000,000,000 bytes and 1 TiB = 1,099,511,627,776 bytes.

The copy duration estimator uses decimal units (1 To = 10^12 bytes, 1 Go = 10^9 bytes) and binary units (1 TiB = 2^40 bytes, 1 GiB = 2^30 bytes) distinctly. Throughput can be entered in bytes per second or decimal bits per second (8 bits = 1 byte). The displayed duration assumes a constant transfer rate and excludes protocol overhead and other real-world slowdowns.

## Rebuild estimate assumptions

Rebuild durations are per-disk estimates. The optimistic duration is disk capacity divided by the selected disk's nominal rebuild throughput. The realistic duration applies the configured workload percentage, then a domain-contention factor: 0% per member beyond two for RAID 1/10, 8% for each additional member in a RAID 5/50 recovery domain, and 12% for each additional member in RAID 6/60. For RAID 50/60, the recovery domain is one RAID group. The degraded estimate adds 35% to the realistic duration. These are explicit scenario assumptions, not hardware guarantees; controller behavior, rebuild priorities, workload, and read errors can substantially change actual times. RAID 0 has no redundancy, so a failed disk cannot be rebuilt.

Online tool : https://jdavvfr.github.io/storage-tools/
