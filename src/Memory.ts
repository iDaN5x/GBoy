/**
 * Created by Idan Asraf on 19/03/2017.
 *
 * Developer's note:
 * The Z80 CPU's architecture is little endian.
 */
import {Byte, Word} from "./Primitives";

export class Memory {
    public constructor() { this.Reset(); }

    public Reset() : void {}

    public Read(address: Word) : Byte {
        // TODO: Implement supporting word restriction.
        address &= 0xffff;
        return 0;
    }

    public ReadWord(address: Word) : Word {
        return (
            this.Read(address) +
            (this.Read(address + 1) << 8)
        );
    }

    public Write(address: Word, value: Byte) : void {
        // TODO: Implement supporting size restrictions.
    }

    public WriteWord(address: Word, value: Word) : void {
        this.Write(address, value & 0xff);
        this.Write(address + 1, value >> 8);
    }
}

export type PageZeroLocation = 0x0|0x8|0x10|0x18|0x20|0x28|0x30|0x38;

export default Memory;