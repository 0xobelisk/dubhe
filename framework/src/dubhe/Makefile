.PHONY: test test-fast test-default-full test-native test-address test-dapp-system test-session test-audit print-test-config gas-profile gas-baseline-update gas-baseline-check coverage coverage-gate fuzz fuzz-smoke fuzz-replay quality-trend quality-baseline-update audit-report

SUI_TEST_GAS_LIMIT ?= 200000000
SUI_TEST_CMD = sui move test --gas-limit $(SUI_TEST_GAS_LIMIT)
SUI_COVERAGE_THRESHOLD_PCT ?= 6.5
SUI_GAS_REGRESSION_THRESHOLD_PCT ?= 0.1
SUI_MAX_FUZZ_FAILURE_RATE_PCT ?= 0
GAS_BASELINE_FILE ?= .ci/move-gas-baseline.json
QUALITY_BASELINE_FILE ?= .ci/move-quality-baseline.json
REPORT_DIR ?= .reports
GAS_PROFILE_LOG ?= $(REPORT_DIR)/move-gas-profile.log
GAS_CURRENT_FILE ?= $(REPORT_DIR)/move-gas-current.json
COVERAGE_TEST_LOG ?= $(REPORT_DIR)/move-coverage-test.log
COVERAGE_SUMMARY_FILE ?= $(REPORT_DIR)/move-coverage-summary.txt
COVERAGE_LCOV_FILE ?= $(REPORT_DIR)/lcov.info
FUZZ_LOG_FILE ?= $(REPORT_DIR)/move-fuzz.log
FUZZ_REPORT_FILE ?= $(REPORT_DIR)/move-fuzz-report.json
QUALITY_TIMELINE_FILE ?= $(REPORT_DIR)/move-quality-timeline.json
QUALITY_SNAPSHOT_FILE ?= $(REPORT_DIR)/move-quality-snapshot.json
QUALITY_CHART_FILE ?= $(REPORT_DIR)/move-quality-trend.html
QUALITY_CHART_TITLE ?= Dubhe Quality Trend
QUALITY_LABEL ?= local
AUDIT_REPORT_FILE ?= $(REPORT_DIR)/move-audit-report.md
AUDIT_TEMPLATE_FILE ?= .ci/move-audit-template.md
FUZZ_ITERATIONS ?= 20
FUZZ_RAND_NUM_ITERS ?= 50
FUZZ_FILTER ?=
FUZZ_BASE_SEED ?=
FUZZ_REPLAY_SEED ?=

ensure-report-dir:
	@mkdir -p "$(REPORT_DIR)"
	@mkdir -p "$(dir $(GAS_BASELINE_FILE))"

print-test-config:
	@echo "SUI_TEST_GAS_LIMIT=$(SUI_TEST_GAS_LIMIT)"
	@echo "SUI_COVERAGE_THRESHOLD_PCT=$(SUI_COVERAGE_THRESHOLD_PCT)"
	@echo "SUI_GAS_REGRESSION_THRESHOLD_PCT=$(SUI_GAS_REGRESSION_THRESHOLD_PCT)"
	@echo "SUI_MAX_FUZZ_FAILURE_RATE_PCT=$(SUI_MAX_FUZZ_FAILURE_RATE_PCT)"
	@echo "QUALITY_CHART_FILE=$(QUALITY_CHART_FILE)"
	@echo "QUALITY_CHART_TITLE=$(QUALITY_CHART_TITLE)"
	@echo "FUZZ_ITERATIONS=$(FUZZ_ITERATIONS)"
	@echo "FUZZ_RAND_NUM_ITERS=$(FUZZ_RAND_NUM_ITERS)"

test: print-test-config
	$(SUI_TEST_CMD)

test-fast: print-test-config
	$(SUI_TEST_CMD) address_test
	$(SUI_TEST_CMD) dapp_system_test

test-default-full: print-test-config
	$(SUI_TEST_CMD)

test-native:
	sui move test

test-address: print-test-config
	$(SUI_TEST_CMD) address_test

test-dapp-system: print-test-config
	$(SUI_TEST_CMD) dapp_system_test

test-session: print-test-config
	$(SUI_TEST_CMD) session_cap_test
	$(SUI_TEST_CMD) session_flow_scenario_test

test-audit: print-test-config
	$(SUI_TEST_CMD)

gas-profile: print-test-config ensure-report-dir
	$(SUI_TEST_CMD) --statistics csv | tee "$(GAS_PROFILE_LOG)"
	node ./scripts/move_quality.mjs parse-gas --input "$(GAS_PROFILE_LOG)" --output "$(GAS_CURRENT_FILE)"

gas-baseline-update: gas-profile
	cp "$(GAS_CURRENT_FILE)" "$(GAS_BASELINE_FILE)"
	@echo "Gas baseline updated: $(GAS_BASELINE_FILE)"

gas-baseline-check: gas-profile
	node ./scripts/move_quality.mjs compare-gas --current "$(GAS_CURRENT_FILE)" --baseline "$(GAS_BASELINE_FILE)" --threshold "$(SUI_GAS_REGRESSION_THRESHOLD_PCT)"

coverage: print-test-config ensure-report-dir
	@set -euo pipefail; \
	trace_flag="--trace"; \
	if ! (sui move test --help 2>/dev/null | grep -Eq '(^|[[:space:]])--trace([[:space:]]|$$)'); then \
		trace_flag="--trace-execution"; \
	fi; \
	echo "Using coverage trace flag: $$trace_flag"; \
	$(SUI_TEST_CMD) --coverage $$trace_flag | tee "$(COVERAGE_TEST_LOG)"; \
	sui move coverage summary | tee "$(COVERAGE_SUMMARY_FILE)"; \
	if sui move coverage --help 2>/dev/null | grep -Eq '^[[:space:]]*lcov([[:space:]]|$$)'; then \
		if sui move coverage lcov; then \
			if [ -f lcov.info ]; then \
				cp lcov.info "$(COVERAGE_LCOV_FILE)"; \
				echo "Coverage lcov copied to $(COVERAGE_LCOV_FILE)"; \
			else \
				echo "Coverage lcov command succeeded but lcov.info not found"; \
			fi; \
		else \
			echo "Coverage lcov generation failed; continuing with summary gate only"; \
		fi; \
	else \
		echo "Coverage lcov subcommand not available in this Sui CLI; summary gate only"; \
	fi

coverage-gate: coverage
	node ./scripts/move_quality.mjs check-coverage --summary "$(COVERAGE_SUMMARY_FILE)" --threshold "$(SUI_COVERAGE_THRESHOLD_PCT)"

fuzz: print-test-config ensure-report-dir
	@set -euo pipefail; \
	base_seed="$(FUZZ_BASE_SEED)"; \
	if [ -z "$$base_seed" ]; then base_seed="$$(date +%s)"; fi; \
	: > "$(FUZZ_LOG_FILE)"; \
	echo "FUZZ base_seed=$$base_seed iterations=$(FUZZ_ITERATIONS)" | tee -a "$(FUZZ_LOG_FILE)"; \
	echo "NOTE: Current Sui CLI does not allow --seed with --rand-num-iters together; running seeded mode without --rand-num-iters" | tee -a "$(FUZZ_LOG_FILE)"; \
	executed=0; \
	failed=0; \
	failing_seed=""; \
	i=0; \
	while [ "$$i" -lt "$(FUZZ_ITERATIONS)" ]; do \
		seed=$$((base_seed + i)); \
		executed=$$((executed + 1)); \
		echo "Running fuzz seed=$$seed" | tee -a "$(FUZZ_LOG_FILE)"; \
		if ! ($(SUI_TEST_CMD) --seed "$$seed" $(FUZZ_FILTER) 2>&1 | tee -a "$(FUZZ_LOG_FILE)"); then \
			failed=1; \
			failing_seed="$$seed"; \
			echo "Fuzz failure at seed=$$seed" | tee -a "$(FUZZ_LOG_FILE)"; \
			echo "Repro: make fuzz-replay FUZZ_REPLAY_SEED=$$seed FUZZ_FILTER='$(FUZZ_FILTER)'" | tee -a "$(FUZZ_LOG_FILE)"; \
			break; \
		fi; \
		i=$$((i + 1)); \
	done; \
	node ./scripts/move_quality.mjs parse-fuzz --input "$(FUZZ_LOG_FILE)" --output "$(FUZZ_REPORT_FILE)"; \
	if [ "$$failed" -ne 0 ]; then exit 1; fi

fuzz-smoke:
	@$(MAKE) fuzz FUZZ_ITERATIONS=5 FUZZ_RAND_NUM_ITERS=20

fuzz-replay: print-test-config
	@if [ -z "$(FUZZ_REPLAY_SEED)" ]; then \
		echo "Please provide FUZZ_REPLAY_SEED=<seed>"; \
		exit 1; \
	fi
	$(SUI_TEST_CMD) --seed "$(FUZZ_REPLAY_SEED)" $(FUZZ_FILTER)

quality-trend: ensure-report-dir
	node ./scripts/move_quality.mjs quality-trend \
		--timeline "$(QUALITY_TIMELINE_FILE)" \
		--snapshot "$(QUALITY_SNAPSHOT_FILE)" \
		--baseline "$(QUALITY_BASELINE_FILE)" \
		--gas-profile "$(GAS_CURRENT_FILE)" \
		--coverage-summary "$(COVERAGE_SUMMARY_FILE)" \
		--fuzz-report "$(FUZZ_REPORT_FILE)" \
		--label "$(QUALITY_LABEL)" \
		--max-gas-regression "$(SUI_GAS_REGRESSION_THRESHOLD_PCT)" \
		--min-coverage "$(SUI_COVERAGE_THRESHOLD_PCT)" \
		--max-fuzz-failure-rate "$(SUI_MAX_FUZZ_FAILURE_RATE_PCT)" \
		--chart-out "$(QUALITY_CHART_FILE)" \
		--chart-title "$(QUALITY_CHART_TITLE)"

quality-baseline-update: quality-trend
	cp "$(QUALITY_SNAPSHOT_FILE)" "$(QUALITY_BASELINE_FILE)"
	@echo "Quality baseline updated: $(QUALITY_BASELINE_FILE)"

audit-report: ensure-report-dir
	node ./scripts/move_quality.mjs render-audit-report \
		--template "$(AUDIT_TEMPLATE_FILE)" \
		--snapshot "$(QUALITY_SNAPSHOT_FILE)" \
		--output "$(AUDIT_REPORT_FILE)" \
		--label "$(QUALITY_LABEL)"
