# Data and ML Checklist

Each item is a check a data consumer or a model's user would fail you on. Practice reference: https://developers.google.com/machine-learning/guides/rules-of-ml.

## Pipelines

- Every run is idempotent: re-running a date range replaces its output, never duplicates it. A backfill is one command
- Each input is checked against its schema at the boundary. A missing column, a type change, or a null spike fails the run and names the column, instead of writing bad rows
- Each output has a freshness target and a row-count check, with an alert when either fails
- Event time and processing time are distinct, time zones are explicit, and late data has a stated rule
- Each output records the inputs and the code version that produced it

## Reproducible

- A run records its code version, config, data snapshot, and random seed. Those four reproduce it
- Dependencies are pinned in a lockfile or an image
- Notebooks are for exploration. Code a pipeline or a model depends on lives in a tested module

## Models

- A baseline exists (a heuristic or the current model). Every candidate is compared to it on the same held-out set
- The split comes before feature work, with no leakage: no row, user, or time period lands in two sets the split is meant to separate
- Features are computed by the same code at training and at serving time
- Acceptance is a threshold on a named metric over a fixed evaluation set. "Looks better" is not a result
- The metric is reported per slice that matters (segment, region, rare class), not only overall
- A model card names intended use, training data, metrics per slice, and known limits: https://arxiv.org/abs/1810.03993

## Serving

- Inference has a measured latency budget and cost per 1,000 predictions
- Input and prediction distributions are monitored, with an alert on drift
- The previous model version is restored in one step
