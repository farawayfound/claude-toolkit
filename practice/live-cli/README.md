# deals

The CLI the sales agent calls to read and change CRM deals. The agent harness runs one command per
tool call and exports `DEALS_ACTOR`, the id of the signed-in user the agent is acting for.

```bash
python3 -m deals list
python3 -m deals update d-101 --set stage=won --as u-ana
python3 -m deals close d-102 --lost
```

Data lives in `data/deals.json` (a stand-in for the CRM API); team membership in `deals/directory.py`.

## Tests

```bash
python3 -m unittest -v
```

Standard library only; no install step.
