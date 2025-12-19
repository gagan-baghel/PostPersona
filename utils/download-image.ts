/**
 * Downloads an image from a given URL to the user's local device
 * Handles both placeholder SVGs and real image URLs
 */
export async function handleDownloadImage(imageUrl: string, filename = "personapost-image.png") {
  try {
    // Fetch the image as a blob
    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error("Failed to fetch image")
    }

    const blob = await response.blob()

    // Create a temporary URL for the blob
    const blobUrl = URL.createObjectURL(blob)

    // Create a temporary anchor element and trigger download
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error("[v0] Error downloading image:", error)
    throw new Error("Failed to download image")
  }
}
