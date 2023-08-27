use core::serde::Serde;
use starknet::ContractAddress;
use array::{ArrayTrait, SpanTrait};
use starknet::{SyscallResult, TryInto, Into, OptionTrait};
use starknet::storage_access::{Store, StorePacking, StorageBaseAddress};
use result::ResultTrait;

#[starknet::interface]
trait IERC20<TContractState> {
    fn transferFrom(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256
    ) -> bool;
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
        1_u8 + Store::<felt252>::size()
    }
}

#[starknet::contract]
mod StarknetHomepage {
    use starknet::{ContractAddress, get_contract_address, contract_address_const};
    use openzeppelin::token::erc721::ERC721;
    use zeroable::Zeroable;
    use traits::TryInto;
    use option::OptionTrait;
    use array::ArrayTrait;
    use core::traits::Into;
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::StoreFelt252Array;

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
    }

    #[constructor]
    fn constructor(ref self: ContractState,) {
        let name = 'StarknetHomepage';
        let symbol = 'SHP';

        let mut unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::InternalImpl::initializer(ref unsafe_state, name, symbol);
        self.nft_counter.write(0);
    }

    #[external(v0)]
    fn supportsInterface(self: @ContractState, interface_id: felt252) -> bool {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::SRC5Impl::supports_interface(@unsafe_state, interface_id)
    }

    #[external(v0)]
    fn name(self: @ContractState) -> felt252 {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721MetadataImpl::name(@unsafe_state)
    }

    #[external(v0)]
    fn symbol(self: @ContractState) -> felt252 {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721MetadataImpl::symbol(@unsafe_state)
    }

    #[external(v0)]
    fn tokenUri(self: @ContractState, token_id: u256) -> felt252 {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721MetadataImpl::token_uri(@unsafe_state, token_id)
    }

    #[external(v0)]
    fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721Impl::balance_of(@unsafe_state, account)
    }

    #[external(v0)]
    fn ownerOf(self: @ContractState, token_id: u256) -> ContractAddress {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721Impl::owner_of(@unsafe_state, token_id)
    }

    #[external(v0)]
    fn getApproved(self: @ContractState, token_id: u256) -> ContractAddress {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721Impl::get_approved(@unsafe_state, token_id)
    }

    #[external(v0)]
    fn isApprovedForAll(
        self: @ContractState, owner: ContractAddress, operator: ContractAddress
    ) -> bool {
        let unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721Impl::is_approved_for_all(@unsafe_state, owner, operator)
    }

    #[external(v0)]
    fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
        let mut unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721Impl::approve(ref unsafe_state, to, token_id)
    }

    #[external(v0)]
    fn setApprovalForAll(ref self: ContractState, operator: ContractAddress, approved: bool) {
        let mut unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721Impl::set_approval_for_all(ref unsafe_state, operator, approved)
    }

    #[external(v0)]
    fn transferFrom(
        ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256
    ) {
        let mut unsafe_state = ERC721::unsafe_new_contract_state();
        ERC721::ERC721Impl::transfer_from(ref unsafe_state, from, to, token_id)
    }

    #[external(v0)]
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

    #[external(v0)]
    fn mint(
        ref self: ContractState,
        _xpos: u8,
        _ypos: u8,
        _width: u8,
        _height: u8,
        _img: Array<felt252>,
        _link: Array<felt252>,
    ) {
        validateMatrix(ref self, _xpos, _ypos, _width, _height);

        let pixel_price: u256 = 1000000000000000_u256;
        let height: u256 = _height.into();
        let width: u256 = _width.into();
        let mint_price: u256 = height * width * pixel_price;
        let eth_l2_address =
            contract_address_const::<0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7>();
        let _to: ContractAddress = get_contract_address();

        IERC20Dispatcher { contract_address: eth_l2_address }
            .transferFrom(_to, get_contract_address(), mint_price);

        let token_id = self.nft_counter.read();
        let mut unsafe_state = ERC721::unsafe_new_contract_state();
        let mut data: Array<felt252> = ArrayTrait::<felt252>::new();
        data.append(0);
        ERC721::InternalImpl::_safe_mint(ref unsafe_state, _to, token_id, data.span());

        self.xpos.write(token_id, _xpos);
        self.ypos.write(token_id, _ypos);
        self.width.write(token_id, _width);
        self.height.write(token_id, _height);
        self.img.write(token_id, _img);
        self.link.write(token_id, _link);
        self.nft_counter.write(token_id + 1);
    }

    #[external(v0)]
    fn getTokenAttributes(self: @ContractState, token_id: u256) -> (u8, u8, u8, u8) {
        let xpos = self.xpos.read(token_id);
        let ypos = self.ypos.read(token_id);
        let width = self.width.read(token_id);
        let height = self.height.read(token_id);
        (xpos, ypos, width, height)
    }

    #[external(v0)]
    fn getTokenImg(self: @ContractState, token_id: u256) -> Array<felt252> {
        self.img.read(token_id)
    }

    #[external(v0)]
    fn getTokenLink(self: @ContractState, token_id: u256) -> Array<felt252> {
        self.link.read(token_id)
    }

    #[external(v0)]
    fn setTokenImg(ref self: ContractState, token_id: u256, _img: Array<felt252>) {
        self.img.write(token_id, _img);
    }

    #[external(v0)]
    fn setTokenLink(ref self: ContractState, token_id: u256, _link: Array<felt252>) {
        self.link.write(token_id, _link);
    }

    fn validateMatrix(ref self: ContractState, _xpos: u8, _ypos: u8, _width: u8, _height: u8) {
        let mut x: u8 = _xpos;
        let mut y: u8 = _ypos;
        // Validar que las posiciones no se salen de la matrix
        assert(_xpos + _width < 100_u8, 'Minting an invalid position');
        assert(_ypos + _height < 100_u8, 'Minting an invalid position');
        // Validar que las posiciones no se encuentran minteadas
        loop {
            loop {
                // Valida posicion
                let minted: bool = self.matrix.read((x, y));
                assert(!minted, 'Some position already minted.');
                // Si no esta minteada entonces marcamos la posicion como minteada
                self.matrix.write((x, y), true);
                // Avanza una casilla a la derecha
                x += 1;
                // Si llegamos al final salimos del loop
                if x == (_xpos + _width) {
                    break;
                };
            };
            // Avanza una casilla hacia abajo
            y += 1;
            // Si llegamos al final entonces salimos del loop
            if y == (_ypos + _height) {
                break;
            };
        };
    }
}
