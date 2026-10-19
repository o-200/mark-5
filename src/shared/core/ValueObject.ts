/**
 * Base Value Object in Domain-Driven Design.
 * Value objects have no conceptual identity; they are defined by their attributes and are immutable.
 */
export abstract class ValueObject<TProps> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  public equals(other?: ValueObject<TProps>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (this === other) {
      return true;
    }

    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
