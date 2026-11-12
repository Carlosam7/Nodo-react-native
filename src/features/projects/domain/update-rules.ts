import { ValidationFailure } from "@/core/domain/validation-failure";

export function assertCanPublishUpdate(isCreator: boolean, isAcceptedMember: boolean, changesStatus: boolean): void {
  if (!isCreator && !isAcceptedMember) {
    throw new ValidationFailure("Solo el líder o los colaboradores aceptados pueden publicar actualizaciones.");
  }
  if (changesStatus && !isCreator) {
    throw new ValidationFailure("Solo el líder puede cambiar el estado del proyecto.");
  }
}
