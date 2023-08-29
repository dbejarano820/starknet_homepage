import { shortString, num } from "starknet";

const deserializeFeltArray = (arr: any) => {
    return arr.map( (img: bigint) => { return shortString.decodeShortString( num.toHex( img)) }).join("");
 }
    
 
export const deserializeTokenObject = (tokenObject: any) => {
    return {
        token_id: tokenObject.token_id.low.toString(),
        xpos: tokenObject.xpos.toString(),
        ypos: tokenObject.ypos.toString(),
        width: tokenObject.width.toString(),
        height: tokenObject.height.toString(),
        img: deserializeFeltArray(tokenObject.img),
        link: deserializeFeltArray(tokenObject.link),
    }
}
