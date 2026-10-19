/**
 * Standard interface for Application Layer Use Cases.
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
