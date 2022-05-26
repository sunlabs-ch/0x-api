import { BigNumber, Fill, FillAdjustor, FillData, adjustOutput } from '@0x/asset-swapper';
import { MarketOperation } from '@0x/types';
import { SlippageModelManager } from './slippage_model_manager';

export class SlippageModelFillAdjustor implements FillAdjustor {
    constructor(
        private readonly slippageModelManager: SlippageModelManager,
        private readonly sellToken: string,
        private readonly buyToken: string,
        private readonly maxSlippageRate: number,
    ) {}

    public adjustFills(side: MarketOperation, fills: Fill<FillData>[], amount: BigNumber): Fill<FillData>[] {
        return fills.map((f) => {
            const fill = { ...f };
            // Mostly negative, as in the trade experiences a worst price
            // e.g -0.02938
            const expectedSlippage = this.slippageModelManager.calculateExpectedSlippage(
                this.buyToken,
                this.sellToken,
                side === MarketOperation.Sell ? f.output : f.input,
                side === MarketOperation.Sell ? f.input : f.output,
                this.maxSlippageRate,
                [{ name: fill.source, proportion: new BigNumber(1) }],
            );
            // 1000 * (1 + -0.02938) = 970
            const slippageAdjustedOutput = f.output
                .times(new BigNumber(1).plus(expectedSlippage))
                .integerValue(BigNumber.ROUND_UP);
            // Calculate the current penalty (gas) as we do not want to adjust
            // an already adjusted output (compounding the adjustment further)
            const currentPenalty = f.output.minus(f.adjustedOutput).absoluteValue();
            const newAdjustedOutput = adjustOutput(side, slippageAdjustedOutput, currentPenalty);
            fill.adjustedOutput = newAdjustedOutput;
            return fill;
        });
    }
}
