"use server"

export async function createAnuncioAction(anuncio: any) {
  // Dummy implementation matching expected return type
  // Expected usage: const { data, error } = await createAnuncioAction(newAnuncio)
  return { data: { ...anuncio, id: 123 }, error: null }
}
