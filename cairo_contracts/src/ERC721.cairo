use core::serde::Serde;
use starknet::ContractAddress;
use array::{ArrayTrait, SpanTrait};
use starknet::{SyscallResult, TryInto, Into, OptionTrait};
use starknet::storage_access::{Store, StorePacking, StorageBaseAddress};
use result::ResultTrait;

#[starknet::interface]
trait IERC20<TContractState> {
    fn transferFrom(
        ref self: TContractState, sender: felt252, recipient: felt252, amount: u256
    ) -> bool;
    fn balanceOf(self: @TContractState, account: felt252) -> u256;
    fn transfer(ref self: TContractState, recipient: felt252, amount: u256) -> bool;
}

impl StoreFelt252Array of Store<Array<felt252>> {
    fn read(address_domain: u32, base: StorageBaseAddress) -> SyscallResult<Array<felt252>> {
        StoreFelt252Array::read_at_offset(address_domain, base, 0)
    }

    fn write(
        address_domain: u32, base: StorageBaseAddress, value: Array<felt252>
    ) -> SyscallResult<()> {
        StoreFelt252Array::write_at_offset(address_domain, base, 0, value)
    }

    fn read_at_offset(
        address_domain: u32, base: StorageBaseAddress, mut offset: u8
    ) -> SyscallResult<Array<felt252>> {
        let mut arr: Array<felt252> = ArrayTrait::new();

        // Read the stored array's length. If the length is superior to 255, the read will fail.
        let len: u8 = Store::<u8>::read_at_offset(address_domain, base, offset)
            .expect('Storage Span too large');
        offset += 1;

        // Sequentially read all stored elements and append them to the array.
        let exit = len + offset;
        loop {
            if offset >= exit {
                break;
            }

            let value = Store::<felt252>::read_at_offset(address_domain, base, offset).unwrap();
            arr.append(value);
            offset += Store::<felt252>::size();
        };

        Result::Ok(arr)
    }

    fn write_at_offset(
        address_domain: u32, base: StorageBaseAddress, mut offset: u8, mut value: Array<felt252>
    ) -> SyscallResult<()> {
        // // Store the length of the array in the first storage slot. 255 of elements is max
        let len: u8 = value.len().try_into().expect('Storage - Span too large');

        Store::<u8>::write_at_offset(address_domain, base, offset, len);

        offset += 1;

        // Store the array elements sequentially
        loop {
            match value.pop_front() {
                Option::Some(element) => {
                    Store::<felt252>::write_at_offset(address_domain, base, offset, element);

                    offset += Store::<felt252>::size();
                },
                Option::None => {
                    break Result::Ok(());
                }
            };
        }
    }

    fn size() -> u8 {
        255 / Store::<felt252>::size()
    }
}

#[starknet::contract]
mod StarknetHomepage {
    use starknet::{
        ContractAddress, get_contract_address, get_caller_address, contract_address_const,
        contract_address_to_felt252
    };
    use openzeppelin::token::erc721::ERC721;
    use zeroable::Zeroable;
    use traits::TryInto;
    use option::OptionTrait;
    use array::ArrayTrait;
    use core::traits::Into;
    use integer::{u256_safe_divmod, u256_try_as_non_zero};
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::StoreFelt252Array;

    #[derive(Drop, starknet::Store, Serde)]
    struct Cell {
        token_id: u256,
        xpos: u8,
        ypos: u8,
        width: u8,
        height: u8,
        img: Array<felt252>,
        link: Array<felt252>,
    }

    #[storage]
    struct Storage {
        xpos: LegacyMap::<u256, u8>,
        ypos: LegacyMap::<u256, u8>,
        width: LegacyMap::<u256, u8>,
        height: LegacyMap::<u256, u8>,
        img: LegacyMap::<u256, Array<felt252>>,
        link: LegacyMap::<u256, Array<felt252>>,
        nft_counter: u256,
        matrix: LegacyMap::<(u8, u8), bool>,
        token_uri: Array<felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
        ApprovalForAll: ApprovalForAll,
        MetadataUpdated: MetadataUpdated,
        BatchMetadataUpdated: BatchMetadataUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        approved: ContractAddress,
        token_id: u256
    }

    #[derive(Drop, starknet::Event)]
    struct ApprovalForAll {
        owner: ContractAddress,
        operator: ContractAddress,
        approved: bool
    }

    #[derive(Drop, starknet::Event)]
    struct MetadataUpdated {
        token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchMetadataUpdated {
        from_token_id: u256,
        token_id: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState,) {
        let name = 'StarknetHomepage';
        let symbol = 'SHP';

        let mut unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::InternalImpl::initializer(ref unsafe_state, name, symbol);
    }

    #[external(v0)]
    #[generate_trait]
    impl IStarknetHomepageImpl of IStarknetHomepage {
        fn supportsInterface(self: @ContractState, interface_id: felt252) -> bool {
            //Adds support for MetadataUpdated as indicated in eip-4906
            if interface_id == 0x49064906 {
                return true;
            };
            let unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::SRC5Impl::supports_interface(@unsafe_state, interface_id)
        }

        fn name(self: @ContractState) -> felt252 {
            let unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721MetadataImpl::name(@unsafe_state)
        }

        fn symbol(self: @ContractState) -> felt252 {
            let unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721MetadataImpl::symbol(@unsafe_state)
        }

        fn setTokenUri(ref self: ContractState, _token_uri: Array<felt252>) {
            //TODO: Set with real addresses
            let address1: ContractAddress =
                contract_address_const::<0x101356c264081a17e120655aa917f6fd372961315ff565d41417d66746495b3>();

            let address2: ContractAddress =
                contract_address_const::<0x039618efb43fb60252d7804bc8cbce49863c4eab0c8f9b53dd8a53f15747889d>();

            //Only these two contracts can change token_uri
            assert(
                address1 == get_caller_address() || address2 == get_caller_address(),
                'This account cannot update uri.'
            );

            self.token_uri.write(_token_uri);
        }

        fn tokenURI(self: @ContractState, token_id: u256) -> Array<felt252> {
            let mut token_uri: Array<felt252> = ArrayTrait::<felt252>::new();
            token_uri = self.token_uri.read();
            token_uri.append(48+token_id.try_into().unwrap());
            token_uri.append(199354445678); // str_to_felt(".json")
            token_uri
        }

        fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
            let unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::balance_of(@unsafe_state, account)
        }

        fn ownerOf(self: @ContractState, token_id: u256) -> ContractAddress {
            let unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::owner_of(@unsafe_state, token_id)
        }

        fn getApproved(self: @ContractState, token_id: u256) -> ContractAddress {
            let unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::get_approved(@unsafe_state, token_id)
        }

        fn isApprovedForAll(
            self: @ContractState, owner: ContractAddress, operator: ContractAddress
        ) -> bool {
            let unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::is_approved_for_all(@unsafe_state, owner, operator)
        }

        fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            let mut unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::approve(ref unsafe_state, to, token_id)
        }

        fn setApprovalForAll(ref self: ContractState, operator: ContractAddress, approved: bool) {
            let mut unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::set_approval_for_all(ref unsafe_state, operator, approved)
        }

        fn transferFrom(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256
        ) {
            let mut unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::transfer_from(ref unsafe_state, from, to, token_id)
        }

        fn safeTransferFrom(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
            data: Span<felt252>
        ) {
            let mut unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::ERC721Impl::safe_transfer_from(ref unsafe_state, from, to, token_id, data)
        }

        fn mint(
            ref self: ContractState,
            _xpos: u8,
            _ypos: u8,
            _width: u8,
            _height: u8,
            _img: Array<felt252>,
            _link: Array<felt252>,
        ) {
            self.updateMatrix(_xpos, _ypos, _width, _height);

            let cell_price: u256 = 1000000000000000_u256;
            let height: u256 = _height.into();
            let width: u256 = _width.into();
            let mint_price: u256 = height * width * cell_price;
            let eth_l2_address =
                contract_address_const::<0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7>();
            let _to: ContractAddress = get_caller_address();

            IERC20Dispatcher { contract_address: eth_l2_address }
                .transferFrom(
                    contract_address_to_felt252(_to),
                    contract_address_to_felt252(get_contract_address()),
                    mint_price
                );

            let token_id: u256 = self.nft_counter.read();
            let mut unsafe_state = ERC721::unsafe_new_contract_state();
            ERC721::InternalImpl::_mint(ref unsafe_state, _to, token_id);

            self.xpos.write(token_id, _xpos);
            self.ypos.write(token_id, _ypos);
            self.width.write(token_id, _width);
            self.height.write(token_id, _height);
            self.img.write(token_id, _img);
            self.link.write(token_id, _link);
            self.nft_counter.write(token_id + 1);
        }

        fn getTokenAttributes(self: @ContractState, token_id: u256) -> (u8, u8, u8, u8) {
            let xpos = self.xpos.read(token_id);
            let ypos = self.ypos.read(token_id);
            let width = self.width.read(token_id);
            let height = self.height.read(token_id);
            (xpos, ypos, width, height)
        }

        fn getTokenImg(self: @ContractState, token_id: u256) -> Array<felt252> {
            self.img.read(token_id)
        }

        fn getTokenLink(self: @ContractState, token_id: u256) -> Array<felt252> {
            self.link.read(token_id)
        }

        fn setTokenImg(ref self: ContractState, token_id: u256, _img: Array<felt252>) {
            assert(self.ownerOf(token_id) == get_caller_address(), 'Only owner can set image.');
            self.img.write(token_id, _img);
            self.emit(MetadataUpdated { token_id: token_id });
        }

        fn setTokenLink(ref self: ContractState, token_id: u256, _link: Array<felt252>) {
            assert(self.ownerOf(token_id) == get_caller_address(), 'Only owner can set link.');
            self.link.write(token_id, _link);
            self.emit(MetadataUpdated { token_id: token_id });
        }

        fn getTokensByOwner(self: @ContractState, _address: ContractAddress) -> Array<Cell> {
            let mut i: u256 = 0_u256;
            let mut cell: Array<Cell> = ArrayTrait::<Cell>::new();
            let total_counter: u256 = self.nft_counter.read();
            loop {
                if i >= total_counter {
                    break;
                };
                if self.ownerOf(i) == _address {
                    cell
                        .append(
                            Cell {
                                token_id: i,
                                xpos: self.xpos.read(i),
                                ypos: self.ypos.read(i),
                                width: self.width.read(i),
                                height: self.height.read(i),
                                img: self.img.read(i),
                                link: self.link.read(i)
                            }
                        );
                };
                i = i + 1_u256;
            };
            return (cell);
        }

        fn getAllTokens(self: @ContractState) -> Array<Cell> {
            let mut i: u256 = 0_u256;
            let mut cell: Array<Cell> = ArrayTrait::<Cell>::new();
            let total_counter: u256 = self.nft_counter.read();
            loop {
                if i >= total_counter {
                    break;
                };
                cell
                    .append(
                        Cell {
                            token_id: i,
                            xpos: self.xpos.read(i),
                            ypos: self.ypos.read(i),
                            width: self.width.read(i),
                            height: self.height.read(i),
                            img: self.img.read(i),
                            link: self.link.read(i)
                        }
                    );
                i = i + 1_u256;
            };
            return (cell);
        }
        fn withdraw(ref self: ContractState) {
            let eth_l2_address: ContractAddress =
                contract_address_const::<0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7>();

            //TODO: Set with real addresses
            let address1: ContractAddress =
                contract_address_const::<0x101356c264081a17e120655aa917f6fd372961315ff565d41417d66746495b3>();

            let address2: ContractAddress =
                contract_address_const::<0x039618efb43fb60252d7804bc8cbce49863c4eab0c8f9b53dd8a53f15747889d>();

            //Only these two contracts can call withdraw
            assert(
                address1 == get_caller_address() || address2 == get_caller_address(),
                'This account cannot withdraw.'
            );
            // Get current balance and calculate percentages
            let starknet_eth = IERC20Dispatcher { contract_address: eth_l2_address };
            let current_balance: u256 = starknet_eth
                .balanceOf(contract_address_to_felt252(get_contract_address()));
            let (pct70, r1, _) = u256_safe_divmod(
                current_balance * 70, u256_try_as_non_zero(100_u256).unwrap()
            );
            let (pct30, r2, _) = u256_safe_divmod(
                current_balance * 30, u256_try_as_non_zero(100_u256).unwrap()
            );

            // Transfer amounts
            starknet_eth
                .transfer(contract_address_to_felt252(address1), pct70);

            starknet_eth
                .transfer(contract_address_to_felt252(address2), pct30);
        }
    }


    #[generate_trait]
    impl PrivateFunctons of PrivateFunctionsTrait {
        fn updateMatrix(ref self: ContractState, _xpos: u8, _ypos: u8, _width: u8, _height: u8) {
            let mut y: u8 = _ypos;
            let mut x: u8 = _xpos;
            // Validate zero size
            let xend = _xpos + _width; 
            let yend = _ypos + _height;
            assert(_width > 0_u8, 'Invalid size');
            assert(_height > 0_u8, 'Invalid size');

            // Validate positions don't exit the matrix
            assert(xend <= 100_u8, 'Minting an invalid position');
            assert(yend <= 100_u8, 'Minting an invalid position');
            // Validate the positions aren't already minted
            loop {
                // Break if we are done checking the matrix
                if y == yend {
                    break;
                };

                x = _xpos;

                loop {
                    // Break if we are done checking the row
                    if x == xend {
                        break;
                    };

                    // Validate the position
                    let minted: bool = self.matrix.read((x, y));
                    assert(!minted, 'Some position already minted.');

                    // If it's not minted, then mark it as such
                    self.matrix.write((x, y), true);

                    // Move a cell to the right
                    x += 1;
                };
                // Move a cell down
                y += 1;
            };
        }
    }
}
