# The planning chat and the relay

The owner plans in a claude.ai chat that reads this project through the Elysium board connector. It reads the relay below, the issues, and the files on GitHub.

- Keep `docs/relay/from-prime.md` current: after each piece of work, update Now, Shipped, Blocked on the owner and Questions, and the Updated line, then commit and push it. Short, plain sentences.
- Tasks from the planning chat arrive here as GitHub issues labelled board:task; Elysium types each one in. When one is done, close it with a one line comment saying what changed (gh issue close <number> --comment "...").
- The relay and issues are what the planning chat sees, so push before saying something is done.
