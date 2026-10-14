"""Who is on which team and who manages which teams, synced nightly from the identity provider."""

TEAM_OF = {
    "u-ana": "t-east",
    "u-ben": "t-east",
    "u-max": "t-east",
    "u-cy": "t-west",
    "u-dee": "t-west",
    "u-zoe": "t-west",
}

MANAGES = {
    "u-max": {"t-east"},
    "u-zoe": {"t-west"},
}
