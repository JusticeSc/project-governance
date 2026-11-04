# Tooling ownership

Root package scripts bind the source-derived scheduler to retained Node build, typecheck, lint, coverage, publication, documentation, translation and Agent Note checks. Keep gate ids and script names synchronized; a missing prerequisite must fail before consumers run.

Compiler output and artifact consumers are separate from source aliases. Coverage includes every retained package runtime source; application behavior and built-entry tests remain required, not newly coverage-thresholded. Package runtime code retains 100% thresholds for each file and no inherited product exemptions.

Git-dependent checks require this tree's own Git index/history and a real trusted baseline; never borrow an enclosing repository or fabricate commits. Hook installation is explicit, and staged validation never fixes or restages files.
