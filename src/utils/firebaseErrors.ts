import { FirebaseError } from 'firebase/app';

export function getFirebaseErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  switch (error.code) {
    case 'permission-denied':
      return 'Permiso denegado por reglas de Firestore. Verifica sesión activa y reglas para /users/{uid}/...';
    case 'unauthenticated':
      return 'Debes iniciar sesión para guardar o leer datos de Firestore.';
    case 'unavailable':
      return 'Firestore no está disponible temporalmente. Revisa tu conexión e inténtalo de nuevo.';
    case 'failed-precondition':
      return 'Firestore requiere una precondición no cumplida (por ejemplo, índice o configuración).';
    case 'not-found':
      return 'Documento no encontrado en Firestore.';
    default:
      return `${fallback} (${error.code})`;
  }
}
