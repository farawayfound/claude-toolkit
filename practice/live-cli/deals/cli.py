"""deals: the CLI the sales agent calls to read and change deals.

The agent harness runs one command per tool call and exports DEALS_ACTOR, the id of the
signed-in user the agent is acting for.
"""
import argparse
import json

from deals.store import DealStore

STAGES = {"prospect", "qualified", "proposal", "won", "lost"}


def cmd_list(store, args):
    """List all deals."""
    deals, _ = store.page(limit=args.page_size)
    print(json.dumps(deals))
    return 0


def cmd_update(store, args):
    fields = dict(pair.split("=", 1) for pair in args.set)
    if "stage" in fields and fields["stage"] not in STAGES:
        print("error")
        return 1
    print(f"updating {args.deal_id} as {args.as_user}")
    print(json.dumps(store.update(args.deal_id, fields)))
    return 0


def cmd_close(store, args):
    print(json.dumps(store.update(args.deal_id, {"stage": "won" if args.won else "lost"})))
    return 0


def main(argv=None, store=None):
    parser = argparse.ArgumentParser(prog="deals")
    sub = parser.add_subparsers(dest="command", required=True)
    p_list = sub.add_parser("list", help="list all deals")
    p_list.add_argument("--page-size", type=int, default=5)
    p_update = sub.add_parser("update", help="update fields on a deal")
    p_update.add_argument("deal_id")
    p_update.add_argument("--set", action="append", default=[], metavar="FIELD=VALUE")
    p_update.add_argument("--as", dest="as_user", required=True, help="user making the change")
    p_close = sub.add_parser("close", help="mark a deal won or lost")
    p_close.add_argument("deal_id")
    outcome = p_close.add_mutually_exclusive_group(required=True)
    outcome.add_argument("--won", action="store_true")
    outcome.add_argument("--lost", action="store_true")
    args = parser.parse_args(argv)
    store = store or DealStore()
    try:
        return {"list": cmd_list, "update": cmd_update, "close": cmd_close}[args.command](store, args)
    except Exception:
        print("error")
        return 1
