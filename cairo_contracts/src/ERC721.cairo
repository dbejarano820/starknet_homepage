use core::serde::Serde;
//Template from https://github.com/reddio-com/cairo/tree/main
use starknet::ContractAddress;
use array::{ArrayTrait, SpanTrait};
use starknet::{SyscallResult, TryInto, Into, OptionTrait};
use starknet::storage_access::{Store, StorePacking, StorageBaseAddress};
use result::ResultTrait;

impl StoreFelt252Array of Store<Array<felt252>>{ 
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
        let len: u8 = Store::<u8>::read_at_offset(address_domain, base, offset).expect('Storage Span too large');
        offset += 1;

        // Sequentially read all stored elements and append them to the array.
        let exit = len + offset;
        loop {
            if offset >= exit {
                break;
            }

            let value = Store::<felt252>::read_at_offset(
                address_domain, base, offset
            )
                .unwrap();
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
                    Store::<felt252>::write_at_offset(
                        address_domain, base, offset, element
                    );

                    offset += Store::<felt252>::size();
                },
                Option::None => {
                    break Result::Ok(());
                }
            };
        }
    }

    fn size() -> u8 {

        1_u8 + Store::<felt252>::size()

    }
}

#[starknet::interface]
trait IERC721<TContractState> {
    fn get_name(self: @TContractState) -> felt252;
    fn get_symbol(self: @TContractState) -> felt252;
    fn token_uri(self: @TContractState, token_id: u256) -> felt252;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn is_approved_for_all(
        self: @TContractState, owner: ContractAddress, operator: ContractAddress
    ) -> bool;

    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn get_approved(self: @TContractState, token_id: u256) -> ContractAddress;

    fn set_approval_for_all(
        ref self: TContractState, operator: ContractAddress, approved: bool
    );
    fn approve(ref self: TContractState, to: ContractAddress, token_id: u256);
    fn transfer_from(
        ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256
    );
    fn mint2(
        ref self: TContractState, 
        _to: ContractAddress, 
        _token_id: felt252, 
        _xpos: felt252, 
        _ypos: felt252, 
        _width: felt252, 
        _height: felt252,
        _img: Array<felt252>,
        _link: Array<felt252>,
    );
    fn get_attributes(self: @TContractState, token_id: felt252) -> (felt252, felt252, felt252, felt252);
    fn get_url_img(self: @TContractState, token_id: felt252) -> Array<felt252>;
    fn get_url_link(self: @TContractState, token_id: felt252) -> Array<felt252>;
    fn set_url_img(ref self: TContractState, _token_id: felt252, _img: Array<felt252>);
    fn set_url_link(ref self: TContractState, _token_id: felt252, _link: Array<felt252>);
}

#[starknet::contract]
mod ERC721 {
    use starknet::get_caller_address;
    use starknet::contract_address_const;
    use starknet::ContractAddress;
    use traits::Into;
    use zeroable::Zeroable;
    use traits::TryInto;
    use option::OptionTrait;
    use super::StoreFelt252Array;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        owners: LegacyMap::<u256, ContractAddress>,
        balances: LegacyMap::<ContractAddress, u256>,
        token_approvals: LegacyMap::<u256, ContractAddress>,
        /// (owner, operator)
        operator_approvals: LegacyMap::<(ContractAddress, ContractAddress), bool>,
        xpos: LegacyMap::<felt252, felt252>,
        ypos: LegacyMap::<felt252, felt252>,
        width: LegacyMap::<felt252, felt252>,
        height: LegacyMap::<felt252, felt252>,
        img: LegacyMap::<felt252, Array<felt252>>,
        link: LegacyMap::<felt252, Array<felt252>>,
        nft_counter: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Approval: Approval,
        Transfer: Transfer,
        ApprovalForAll: ApprovalForAll,
    }
    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress, 
        to: ContractAddress, 
        token_id: u256
    }
    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress, 
        to: ContractAddress, 
        token_id: u256
    }
    #[derive(Drop, starknet::Event)]
    struct ApprovalForAll {
        owner: ContractAddress, 
        operator: ContractAddress, 
        approved: bool
    }

    #[constructor]
    fn constructor(ref self: ContractState, _name: felt252, _symbol: felt252) {
        self.name.write(_name);
        self.symbol.write(_symbol);
    }

    #[external(v0)]
    impl IERC721Impl of super::IERC721<ContractState> {
        fn get_name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn get_symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            assert(!account.is_zero(), 'ERC721: address zero');
            self.balances.read(account)
        }

        fn is_approved_for_all(self: @ContractState, owner: ContractAddress, operator: ContractAddress) -> bool {
            self._is_approved_for_all(owner, operator)
        }

        fn token_uri(self: @ContractState, token_id: u256) -> felt252 {
            self._require_minted(token_id);
            let base_uri = self._base_uri();
            base_uri + token_id.try_into().unwrap()
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            let owner = self._owner_of(token_id);
            assert(!owner.is_zero(), 'ERC721: invalid token ID');
            owner
        }

        fn get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            self._get_approved(token_id)
        }

        fn transfer_from(ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256) {
            assert(self._is_approved_or_owner(get_caller_address(), token_id), 'Caller is not owner or appvored');
            self._transfer(from, to, token_id);
        }

        fn set_approval_for_all(ref self: ContractState, operator: ContractAddress, approved: bool) {
            self._set_approval_for_all(get_caller_address(), operator, approved);
        }

        fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            let owner = self._owner_of(token_id);
            // Unlike Solidity, require is not supported, only assert can be used
            // The max length of error msg is 31 or there's an error
            assert(to != owner, 'Approval to current owner');
            // || is not supported currently so we use | here
            assert((get_caller_address() == owner) | self._is_approved_for_all(owner, get_caller_address()), 'Not token owner');
            self._approve(to, token_id);
        }

        fn mint2(ref self: ContractState, 
            _to: ContractAddress, 
            _token_id: felt252, 
            _xpos: felt252, 
            _ypos: felt252, 
            _width: felt252, 
            _height: felt252,
            _img: Array<felt252>,
            _link: Array<felt252>) {
                // TODO: Validar que no este minteada la posicion
                // TODO: Validar que el que mintea envie los 0.001ETH
                // Store NFT Attributes
                self.xpos.write(_token_id, _xpos);
                self.ypos.write(_token_id, _ypos);
                self.width.write(_token_id, _width);
                self.height.write(_token_id, _height);
                self.img.write(_token_id, _img);
                self.link.write(_token_id, _link);
                // Mint NFT
                self._mint (_to, _token_id.into());
                self.nft_counter.write(self.nft_counter.read() + 1);
        }

        fn get_attributes(self: @ContractState, token_id: felt252) -> (felt252, felt252, felt252, felt252) {
            return(self.xpos.read(token_id),self.ypos.read(token_id),self.width.read(token_id),self.height.read(token_id));
        }

        fn get_url_img(self: @ContractState, token_id: felt252) -> Array<felt252>{
            return(self.img.read(token_id));
        }

        fn get_url_link(self: @ContractState, token_id: felt252) -> Array<felt252>{
            return(self.link.read(token_id));
        }

        fn set_url_img(ref self: ContractState, _token_id: felt252, _img: Array<felt252>) {
            // TODO: Onlyowner
            self.img.write(_token_id, _img);
        }

        fn set_url_link(ref self: ContractState, _token_id: felt252, _link: Array<felt252>) {
            // TODO: Onlyowner
            self.img.write(_token_id, _link);
        }
    }

    #[generate_trait]
    impl StorageImpl of StorageTrait {
        fn _set_approval_for_all(ref self: ContractState, owner: ContractAddress, operator: ContractAddress, approved: bool) {
            assert(owner != operator, 'ERC721: approve to caller');
            self.operator_approvals.write((owner, operator), approved);
            self.emit(Event::ApprovalForAll(ApprovalForAll { owner, operator, approved }));
        }

        fn _approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            self.token_approvals.write(token_id, to);
            self.emit(Event::Approval(Approval {owner: self._owner_of(token_id), to, token_id }));
        }

        fn _is_approved_for_all(self: @ContractState, owner: ContractAddress, operator: ContractAddress) -> bool {
            self.operator_approvals.read((owner, operator))
        }

        fn _owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.owners.read(token_id)
        }

        fn _exists(self: @ContractState, token_id: u256) -> bool {
            !self._owner_of(token_id).is_zero()
        }

        fn _base_uri(self: @ContractState) -> felt252 {
            ''
        }

        fn _get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            self._require_minted(token_id);
            self.token_approvals.read(token_id)
        }

        fn _require_minted(self: @ContractState, token_id: u256) {
            assert(self._exists(token_id), 'ERC721: invalid token ID');
        }

        fn _is_approved_or_owner(self: @ContractState, spender: ContractAddress, token_id: u256) -> bool {
            let owner = self.owners.read(token_id);
            // || is not supported currently so we use | here
            (spender == owner)
                | self._is_approved_for_all(owner, spender) 
                | (self._get_approved(token_id) == spender)
        }

        fn _transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256) {
            assert(from == self._owner_of(token_id), 'Transfer from incorrect owner');
            assert(!to.is_zero(), 'ERC721: transfer to 0');

            self._beforeTokenTransfer(from, to, token_id, 1.into());
            assert(from == self._owner_of(token_id), 'Transfer from incorrect owner');

            self.token_approvals.write(token_id, contract_address_const::<0>());

            self.balances.write(from, self.balances.read(from) - 1.into());
            self.balances.write(to, self.balances.read(to) + 1.into());

            self.owners.write(token_id, to);

            self.emit(Event::Transfer(Transfer { from, to, token_id }));

            self._afterTokenTransfer(from, to, token_id, 1.into());
        }

        fn _mint(ref self: ContractState, to: ContractAddress, token_id: u256) {
            assert(!to.is_zero(), 'ERC721: mint to 0');
            assert(!self._exists(token_id), 'ERC721: already minted');
            self._beforeTokenTransfer(contract_address_const::<0>(), to, token_id, 1.into());
            assert(!self._exists(token_id), 'ERC721: already minted');

            self.balances.write(to, self.balances.read(to) + 1.into());
            self.owners.write(token_id, to);
            // contract_address_const::<0>() => means 0 address
            self.emit(Event::Transfer(Transfer {
                from: contract_address_const::<0>(), 
                to,
                token_id
            }));

            self._afterTokenTransfer(contract_address_const::<0>(), to, token_id, 1.into());
        }

    
        fn _burn(ref self: ContractState, token_id: u256) {
            let owner = self._owner_of(token_id);
            self._beforeTokenTransfer(owner, contract_address_const::<0>(), token_id, 1.into());
            let owner = self._owner_of(token_id);
            self.token_approvals.write(token_id, contract_address_const::<0>());

            self.balances.write(owner, self.balances.read(owner) - 1.into());
            self.owners.write(token_id, contract_address_const::<0>());
            self.emit(Event::Transfer(Transfer {
                from: owner,
                to: contract_address_const::<0>(),
                token_id
            }));

            self._afterTokenTransfer(owner, contract_address_const::<0>(), token_id, 1.into());
        }

        fn _beforeTokenTransfer(
            ref self: ContractState, 
            from: ContractAddress, 
            to: ContractAddress, 
            first_token_id: u256, 
            batch_size: u256
        ) {}

        fn _afterTokenTransfer(
            ref self: ContractState, 
            from: ContractAddress, 
            to: ContractAddress, 
            first_token_id: u256, 
            batch_size: u256
        ) {}
    }
}

#[cfg(test)]
mod test_nft {
    use starknet::testing::set_caller_address;
    use starknet::syscalls::deploy_syscall;
    use starknet::{contract_address_const, ContractAddress, TryInto, Into, OptionTrait};
    use array::{ArrayTrait, SpanTrait};
    use serde::Serde;
    
    use result::ResultTrait;
    use debug::PrintTrait;

    use super:: {
            IERC721DispatcherTrait, 
            IERC721Dispatcher, 
            IERC721LibraryDispatcher 
            };
    use super::{ERC721};


    fn setup() -> ContractAddress {
        let account: ContractAddress = contract_address_const::<1>();
        set_caller_address(account);

        let calldata = array!['StarknetHomePage','HPG'];

        let (address0, _) = deploy_syscall(ERC721::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();

        address0
    }

    #[test]
    #[available_gas(10000000)]
    fn test_nft_check_01(){
        let initial_gas = testing::get_available_gas();
        gas::withdraw_gas().unwrap();

        let account = setup();
        let contract_address: ContractAddress = contract_address_const::<0x42>();

        let nft = IERC721Dispatcher{contract_address: account};
        let arr_img = array!['http://url1.com'];
        let arr_link = array!['http://url2.com'];

        nft.mint2(contract_address, 0, 1, 1, 2, 2, arr_img, arr_link);

        let (xpos, ypos, width, height): (felt252, felt252, felt252, felt252) = nft.get_attributes(0);

        assert (xpos == 1, 'Wrong xpos');
        assert (ypos == 1, 'Wrong ypos');
        assert (width == 2, 'Wrong width');
        assert (height == 2, 'Wrong height');

        (initial_gas - testing::get_available_gas()).print();
    }
}