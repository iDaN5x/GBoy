/**
 * Created by Idan Asraf on 19/03/2017.
 *
 * Developer's note:
 * The Z80 CPU's architecture is little endian.
 */
import {UByte, UWord} from "./Primitives";

export class Memory {
    public constructor() { this.Reset(); }

    public Reset(): void {
        // TODO: implement.
    }

    public ReadByte(address: UWord): UByte {
        // TODO: Implement:
        // support UWord size restriction.
        return 0;
    }

    public ReadWord(address: UWord): UWord {
        return (
            this.ReadByte(address) +
            (this.ReadByte(address + 1) << 8)
        );
    }

    public WriteByte(address: UWord, value: UByte): void {
        // TODO: Implement:
        // support Byte size restrictions.
    }

    public WriteWord(address: UWord, value: UWord): void {
        this.WriteByte(address, value & 0xff);
        this.WriteByte(address + 1, value >> 8);
    }
}

export type PageZeroLocation = 0x0|0x8|0x10|0x18|0x20|0x28|0x30|0x38;

export default Memory;