.PHONY: test test-fast test-default-full test-native test-address test-dapp-system test-audit print-test-config

SUI_TEST_GAS_LIMIT ?= 200000000
SUI_TEST_CMD = sui move test --gas-limit $(SUI_TEST_GAS_LIMIT)

print-test-config:
	@echo "SUI_TEST_GAS_LIMIT=$(SUI_TEST_GAS_LIMIT)"

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
