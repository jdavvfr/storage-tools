# Storage Tools

Free online storage tools for capacity planning.

## Available tools

- RAID Calculator: usable capacity, hot spare sizing, rebuild estimates, storage efficiency, and RAID-level comparisons.
- RAID Calculator Advanced: all RAID Calculator configuration and comparison features, plus an IO profile and estimated read/write IOPS.
- To / TiB converter: bidirectional conversion between decimal terabytes (To) and binary tebibytes (TiB). It accepts a comma or point as the decimal separator.
- Copy duration estimator: estimates transfer time from a data volume and throughput, with decimal and binary byte units as well as decimal bit rates.
- Volume growth calculator: projects a source volume over a whole number of years using a compound annual growth rate, and displays the target in the source unit.
- Tape LTO calculator: use one data volume and shared LTO-7/8/9, compression, native/custom write-rate, and job-type settings to estimate cartridges per full backup, write duration, and the total cartridges to acquire for a selected number of identical rotation sets/cycles. VM export jobs can model multiple parallel readers; NAS jobs always use one reader. This is a count of identical sets, not a GFS retention scheme.

The converter uses the same capacity convention as the RAID calculator: 1 To = 1,000,000,000,000 bytes and 1 TiB = 1,099,511,627,776 bytes.

The copy duration estimator uses decimal units (1 To = 10^12 bytes, 1 Go = 10^9 bytes) and binary units (1 TiB = 2^40 bytes, 1 GiB = 2^30 bytes) distinctly. Throughput can be entered in bytes per second or decimal bits per second (8 bits = 1 byte). The displayed duration assumes a constant transfer rate and excludes protocol overhead and other real-world slowdowns.

The volume growth calculator applies `target = source × (1 + annual rate)^years`; enter the annual rate as a percentage (for example, `5` for 5%). It accepts a non-negative source volume, an annual rate of at least -100%, and a positive whole number of years. Decimal or binary volume units are preserved in the displayed target, and a comma or point is accepted as the decimal separator.
Tape LTO capacity estimates use native capacities of 6 To (LTO-7), 12 To (LTO-8), and 18 To (LTO-9) per cartridge. The optional compressed-capacity estimate assumes a 2.5:1 compression ratio; actual compression varies by data and may be lower. This assumption affects cartridge capacity only. Native write-rate references are 300 Mo/s, 360 Mo/s, and 400 Mo/s per reader for LTO-7, LTO-8, and LTO-9 respectively. Write-duration estimates use the entered source volume and assume a constant native sequential rate, or the custom rate entered by the user. VM export jobs optionally scale the aggregate rate linearly by the reader count, assuming balanced distribution and ideal speedup; NAS jobs use one reader without parallelization. The volume and cartridge estimates always remain based on the full volume. Estimates exclude tape mounting, cartridge changes, and other real-world delays. The rotation total is cartridges per full backup multiplied by a positive whole number of identical sets/cycles to retain; it does not model GFS rotations.

## Rebuild estimate assumptions (RAID Calculator)

Rebuild durations are per-disk estimates shown by RAID Calculator. The optimistic duration is disk capacity divided by the selected disk's nominal rebuild throughput. The realistic duration applies the configured workload percentage, then a domain-contention factor: 0% per member beyond two for RAID 1/10, 8% for each additional member in a RAID 5/50 recovery domain, and 12% for each additional member in RAID 6/60. For RAID 50/60, the recovery domain is one RAID group. The degraded estimate adds 35% to the realistic duration. These are explicit scenario assumptions, not hardware guarantees; controller behavior, rebuild priorities, workload, and read errors can substantially change actual times. RAID 0 has no redundancy, so a failed disk cannot be rebuilt.

## RAID IOPS estimate assumptions (RAID Calculator Advanced)

RAID Calculator Advanced offers Sauvegarde, Virtualisation, Fichier, Base de données, and Personnalisé IO profiles. Profiles set an initial read/write ratio, access pattern, and block size; the read and write percentages always total 100% and can be adjusted. Recommendations are generic starting points, not workload measurements.

Logical IOPS are estimated from the active disks' combined physical read and write budgets. Each logical read costs one physical read. For random writes, the assumed physical cost is one write for RAID 0, two writes for RAID 1/10, two reads plus two writes for RAID 5/50, and three reads plus three writes for RAID 6/60. Sequential RAID 5/6/50/60 writes optimistically assume the controller can coalesce and align them into full stripes, with no preread and a physical write cost equal to group members divided by data members. Reads from mirrors are assumed to balance across members. The result is the workload mix's maximum logical IOPS under those budgets, split according to the configured ratio.

Per-disk IOPS references are capped by the listed nominal transfer bandwidth divided by the selected block size. This simplified theoretical model does not represent manufacturer guarantees or benchmark results and excludes cache, controller, queueing, bus limits, and application-specific behavior. Use measured workload traces for sizing production systems.

Online tool : https://jdavvfr.github.io/storage-tools/
