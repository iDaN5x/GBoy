import {Byte, Word} from "./Primitives";
/**
 * Created by Idan Asraf on 19/03/2017.
 *
 * Developer's note:
 * The Z80 CPU's architecture is little endian.
 */
export class Memory {
    public constructor() { this.Reset(); }

    public Reset() : void {}

    public Read(address: Word) : Byte {
        // TODO: word restriction should remain on final implementation.
        address &= 0xffff;
        return 0;
    }

    public ReadWord(address: Word) : Word {
        return (
            this.Read(address) +
            this.Read(address+1) << 8
        );
    }

    public Write(address: Word, value: Byte) : void {}

    public WriteWord(address: Word, value: Word) : void {
        this.Write(address, value & 0xff);
        this.Write(address+1, value >> 8);
    }
}

export default Memory;