/**
 * Created by Idan Asraf on 19/03/2017.
 */
import {Registers, ByteRegister, WordRegister, PointerRegister} from "./Registers";
import {Byte, Word} from "./Primitives";
import {Memory} from "./Memory";
import {Flags} from "./Flags";

export class Z80 {
    private _regs: Registers;
    private _mem: Memory;

    /*
     * Component initialization.
     */
    public constructor() { this.Reset(); }

    public Reset() : void {
        this._regs.Reset();
        this._mem.Reset();
    }

    public Start() : void {}

    /*
     * Flags handling.
     */
    private _hasFlag(flag: Flags) : boolean {
        return Boolean(this._regs.F & flag);
    }

    private _setFlag(flag: Flags, state: boolean = true) {
        if (state) this._regs.F |= flag;
        else       this._regs.F &= ~flag;
    }

    private _unsetFlag(flag: Flags) { this._setFlag(flag, false); }

    private _resetFlags() : void {
        this._regs.F &= 0x0f;
    }

    /*
     * Code fetching.
     */
    private _fetchByte() : Byte {
        return this._mem.Read(this._regs.PC++);
    }

    private _fetchWord() : Word {
        let res = this._mem.ReadWord(this._regs.PC);
        this._regs.PC += 2;
        return res;
    }

    /*
     * Clock decorator.
     */
    Timing(ticks: number) {
        return function(target: Function, propertyKey: string, descriptor: PropertyDescriptor) {
            this._clok
        };
    }

    /*
     * 8-bit Load operations.
     */
    private _LD_r1_r2(r1: ByteRegister, r2: ByteRegister) : void {
        this._regs[r1] = this._regs[r2];
    }

    private _LD_r_n(r: ByteRegister) : void {
        this._regs[r] = this._fetchByte();
    }

    private _LD_r_$HL(r: ByteRegister) : void {
        this._regs[r] = this._mem.Read(this._regs.HL);
    }

    private _LD_$HL_r(r: ByteRegister) : void {
        this._mem.Write(this._regs.HL, this._regs[r]);
    }

    private _LD_$HL_n() : void {
        this._mem.Write(this._regs.HL, this._fetchByte());
    }

    private _LD_A_$rr(rr: WordRegister) : void {
        this._regs.A = this._mem.Read(this._regs[rr]);
    }

    private _LD_A_$nn() : void {
        this._regs.A = this._mem.Read(this._fetchWord());
    }

    private _LD_$rr_A(rr: WordRegister) : void {
        this._mem.Write(this._regs[rr], this._regs.A);
    }

    private _LD_$nn_A() : void {
        this._mem.Write(this._fetchWord(), this._regs.A);
    }

    private _LD_A_$C() : void {
        this._regs.A = this._mem.Read(0xff00 + this._regs.C);
    }

    private _LD_$C_A() : void {
        this._mem.Write(0xff00 + this._regs.C, this._regs.A);
    }

    private _LDD_A_$HL() : void {
        this._regs.A = this._mem.Read(this._regs.HL--);
    }

    private _LDD_$HL_A() : void {
        this._mem.Write(this._regs.HL--, this._regs.A);
    }

    private _LDI_A_$HL() : void {
        this._regs.A = this._mem.Read(this._regs.HL++);
    }

    private _LDI_$HL_A() : void {
        this._mem.Write(this._regs.HL++, this._regs.A);
    }

    private _LDH_$n_A() : void {
        this._mem.Write(0xff00 + this._fetchByte(), this._regs.A);
    }

    private _LD_A_$n() : void {
        this._regs.A = this._mem.Read(0xff00 + this._fetchByte());
    }

    /*
     * 16-bit Load operations.
     */
    private _LD_dd_nn(dd: WordRegister|PointerRegister) : void {
        this._regs[dd] = this._fetchWord();
    }

    private _LD_$nn_SP() : void {
        this._mem.WriteWord(this._fetchWord(), this._regs.SP);
    }

    private _LD_SP_HL() : void {
        this._regs.SP = this._regs.HL;
    }

    private _LD_HL_$SPn() : void {
        let op = this._fetchByte(),
            add = this._regs.SP + op;

        this._regs.HL = this._mem.ReadWord(add);

        //this._setFlag(Flags.Carry, add > 0xffff);
        this._setFlag(Flags.HalfCarry, );
        this._unsetFlag(Flags.Zero | Flags.Negative);
    }
}

export default Z80;