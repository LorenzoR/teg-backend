class DiceService {
  private MAX_NUMBER = 6;

  private MIN_NUMBER = 1;

  public throwDices(count: number): number[] {
    const dices = [];

    for (let i = 0; i < count; i += 1) {
      dices.push(this.throwDice());
    }

    return dices;
  }

  private throwDice(): number {
    return Math.floor(Math.random() * this.MAX_NUMBER) + this.MIN_NUMBER;
  }
}

export default DiceService;
