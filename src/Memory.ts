/**
 * Created by Idan Asraf on 19/03/2017.
 */
import {Byte, UByte, UWord, Word} from "./Primitives";

export class Memory {
    // The Z80 CPU's architecture is little endian.
    private static readonly LITTLE_ENDIAN = true;

    private _buffer: ArrayBuffer;
    private _view: DataView;

    public constructor() { this.Reset(); }

    public Reset() : void {
        this._buffer = new ArrayBuffer(0xffff);
        this._view = new DataView(this._buffer);
    }

    public ReadUByte(address: UWord) : UByte {
        return this._view.getUint8(address);
    }

    public WriteUByte(address: UWord, value: UByte) : void {
        this._view.setUint8(address, value);
    }

    public ReadByte(address: UWord) : Byte {
        return this._view.getInt8(address);
    }

    public WriteByte(address: UWord, value: Byte) : void {
        this._view.setInt8(address, value);
    }

    public ReadUWord(address: UWord) : UWord {
        return this._view.getUint16(address, Memory.LITTLE_ENDIAN);
    }

    public WriteUWord(address: UWord, value: UWord) : void {
        this._view.setUint16(address, value, Memory.LITTLE_ENDIAN);
    }

    public ReadWord(address: UWord) : Word {
        return this._view.getInt16(address, Memory.LITTLE_ENDIAN);
    }

    public WriteWord(address: UWord, value: Word) : void {
        this._view.setInt16(address, value, Memory.LITTLE_ENDIAN);
    }
}

export type PageZeroLocation = 0x0|0x8|0x10|0x18|0x20|0x28|0x30|0x38;

export default Memory;