/**
 * Created by i331547 on 23/03/2017.
 */

export class Instruction {
    private _runner : Function;
    private _args : any[];

    public constructor(runner : Function, ...args : any[]) {
        this._runner = runner;
        this._args = args;
    }

    public Invoke() : void {
        this._runner(this._args);
    }
}

 export default Instruction;