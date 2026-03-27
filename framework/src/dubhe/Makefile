.PHONY: test test-fast test-default-full test-native test-address test-dapp-system test-audit print-test-config gas-profile gas-baseline-update gas-baseline-check coverage coverage-gate fuzz fuzz-smoke fuzz-replay

SUI_TEST_GAS_LIMIT ?= 200000000
SUI_TEST_CMD = sui move test --gas-limit $(SUI_TEST_GAS_LIMIT)
SUI_COVERAGE_THRESHOLD_PCT ?= 6.5
SUI_GAS_REGRESSION_THRESHOLD_PCT ?= 0.1
GAS_BASELINE_FILE ?= .ci/move-gas-baseline.json
REPORT_DIR ?= .reports
GAS_PROFILE_LOG ?= $(REPORT_DIR)/move-gas-profile.log
GAS_CURRENT_FILE ?= $(REPORT_DIR)/move-gas-current.json
COVERAGE_TEST_LOG ?= $(REPORT_DIR)/move-coverage-test.log
COVERAGE_SUMMARY_FILE ?= $(REPORT_DIR)/move-coverage-summary.txt
COVERAGE_LCOV_FILE ?= $(REPORT_DIR)/lcov.info
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
	$(SUI_TEST_CMD) --coverage --trace | tee "$(COVERAGE_TEST_LOG)"
	sui move coverage summary | tee "$(COVERAGE_SUMMARY_FILE)"
	sui move coverage lcov
	cp lcov.info "$(COVERAGE_LCOV_FILE)"
	@echo "Coverage lcov copied to $(COVERAGE_LCOV_FILE)"

coverage-gate: coverage
	node ./scripts/move_quality.mjs check-coverage --summary "$(COVERAGE_SUMMARY_FILE)" --threshold "$(SUI_COVERAGE_THRESHOLD_PCT)"

fuzz: print-test-config
	@set -euo pipefail; \
	base_seed="$(FUZZ_BASE_SEED)"; \
	if [ -z "$$base_seed" ]; then base_seed="$$(date +%s)"; fi; \
	echo "FUZZ base_seed=$$base_seed iterations=$(FUZZ_ITERATIONS)"; \
	echo "NOTE: Current Sui CLI does not allow --seed with --rand-num-iters together; running seeded mode without --rand-num-iters"; \
	i=0; \
	while [ "$$i" -lt "$(FUZZ_ITERATIONS)" ]; do \
		seed=$$((base_seed + i)); \
		echo "Running fuzz seed=$$seed"; \
		if ! $(SUI_TEST_CMD) --seed "$$seed" $(FUZZ_FILTER); then \
			echo "Fuzz failure at seed=$$seed"; \
			echo "Repro: make fuzz-replay FUZZ_REPLAY_SEED=$$seed FUZZ_FILTER='$(FUZZ_FILTER)'"; \
			exit 1; \
		fi; \
		i=$$((i + 1)); \
	done

fuzz-smoke:
	@$(MAKE) fuzz FUZZ_ITERATIONS=5 FUZZ_RAND_NUM_ITERS=20

fuzz-replay: print-test-config
	@if [ -z "$(FUZZ_REPLAY_SEED)" ]; then \
		echo "Please provide FUZZ_REPLAY_SEED=<seed>"; \
		exit 1; \
	fi
	$(SUI_TEST_CMD) --seed "$(FUZZ_REPLAY_SEED)" $(FUZZ_FILTER)
