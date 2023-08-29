config := -- --account ./katana-account/katana_account.json --keystore ./katana-account/katana_key.json --rpc http://0.0.0.0:5050 --keystore-password 1234

# Katana account #1
admin_addr := 0x3ee9e18edc71a6df30ac3aca2e0b02a198fbce19b7480a63a0d71cbd76652e0
erc721_address := 0x03dec5a78099229a4a833b6b780d0f9ca021d10f690d02acfcb20d3a7911c05e
erc20_address := 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
# Katana account #2
katana_2 := 0x33c627a3e5213790e246a917770ce23d7e562baa5b4d2917c23b1be6d91961c

erc721_cl := $(shell starkli class-hash ./target/dev/starknet_homepage_contracts_StarknetHomepage.sierra.json)

setup:
	starkli declare ./target/dev/starknet_homepage_contracts_StarknetHomepage.sierra.json ${config}
	@echo "\n**ERC20**\n"
	starkli deploy --salt 0x1234 ${erc721_cl} ${config}
	starkli invoke ${erc20_address} approve ${erc721_address} 100000000000000000000000 0 ${config}
	starkli invoke ${erc721_address} mint 1 1 1 1 0 0 ${config}
	starkli invoke ${erc721_address} getTokensByOwner ${admin_addr} ${config} --watch


getter:
	starkli transaction 0x04d8bf015ac46e5b9a33fc8b99b11365d47c732b2c229b15af07cff0f04667b2 --rpc http://0.0.0.0:5050