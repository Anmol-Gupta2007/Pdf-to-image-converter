const fileInput = document.getElementById('file-input');
const outputContainer = document.getElementById('output-container');
const uploadArea = document.getElementById('upload-area');
const actionsContainer = document.getElementById('actions-container');
const downloadAllBtn = document.getElementById('download-all-btn');
const downloadZipBtn = document.getElementById('download-zip-btn');

// Array to keep track of all generated images and their "removed" state
let generatedImages = [];
let globalImageIdCounter = 0; // Unique ID to track elements

// --- Drag and Drop Logic ---
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

// --- Click Upload Logic ---
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// --- File Processing ---
async function handleFiles(files) {
    for (const file of files) {
        if (file.type !== 'application/pdf') {
            alert(`"${file.name}" is not a PDF file. Skipping.`);
            continue;
        }
        
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                
                // Process sequentially from Page 1 up to the last page
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    await renderPageToImage(pdf, pageNum, file.name);
                }

                // Show the actions bar once processing is done
                if (generatedImages.length > 0) {
                    actionsContainer.style.display = 'block';
                }

            } catch (error) {
                console.error("Error reading PDF:", error);
                alert("An error occurred while processing " + file.name);
            }
        };
        fileReader.readAsArrayBuffer(file);
    }
    
    fileInput.value = ''; // Reset input
}

// --- Render PDF Page to Image ---
async function renderPageToImage(pdf, pageNum, originalName) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); 

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;

    const imgUrl = canvas.toDataURL('image/png');
    const baseName = originalName.replace('.pdf', '');
    const newFileName = `${baseName}_Page_${pageNum}.png`;
    
    const currentId = globalImageIdCounter++;

    // Store in our array, defaulting "removed" to false
    generatedImages.push({ 
        id: currentId, 
        url: imgUrl, 
        filename: newFileName, 
        removed: false 
    });

    // Build the UI card
    createImageCard(imgUrl, newFileName, currentId);
}

// --- Build UI for Individual Pages ---
function createImageCard(imgUrl, fileName, id) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `card-${id}`;

    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = fileName;

    const nameObj = document.createElement('p');
    nameObj.className = 'file-name';
    nameObj.textContent = fileName;

    // Create Remove Button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '❌ Remove this page';
    
    // Toggle remove logic on click
    removeBtn.onclick = () => {
        const imageObj = generatedImages.find(img => img.id === id);
        if (!imageObj) return;

        imageObj.removed = !imageObj.removed; // Toggle state

        if (imageObj.removed) {
            card.classList.add('removed');
            removeBtn.textContent = '✔️ Removed';
        } else {
            card.classList.remove('removed');
            removeBtn.textContent = '❌ Remove this page';
        }
    };

    card.appendChild(img);
    card.appendChild(nameObj);
    card.appendChild(removeBtn);

    // CHANGED: Using appendChild instead of prepend so pages render in standard 1, 2, 3 order.
    outputContainer.appendChild(card);
}

// --- Download All Logic (Skips removed pages) ---
downloadAllBtn.addEventListener('click', async () => {
    const activeImages = generatedImages.filter(img => !img.removed);

    if (activeImages.length === 0) {
        alert("No pages available to download. You removed them all!");
        return;
    }

    for (let i = 0; i < activeImages.length; i++) {
        const imageFile = activeImages[i];
        
        const a = document.createElement('a');
        a.href = imageFile.url;
        a.download = imageFile.filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Crucial: Wait 300 milliseconds between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 300));
    }
});

// --- Download as ZIP Logic ---
downloadZipBtn.addEventListener('click', async () => {
    const activeImages = generatedImages.filter(img => !img.removed);

    if (activeImages.length === 0) {
        alert("No pages available to zip. You removed them all!");
        return;
    }

    // Change button text briefly to show loading
    const originalText = downloadZipBtn.innerHTML;
    downloadZipBtn.innerHTML = "⏳ Zipping...";
    downloadZipBtn.disabled = true;

    try {
        const zip = new JSZip();

        // Loop through active images and add them to the zip
        activeImages.forEach(imgData => {
            // Data URL format: "data:image/png;base64,iVBORw0KGgo..."
            // We need to split at the comma and take the second part to get raw base64.
            const base64Data = imgData.url.split(',')[1];
            zip.file(imgData.filename, base64Data, { base64: true });
        });

        // Generate the zip file
        const content = await zip.generateAsync({ type: "blob" });
        
        // Trigger download of the ZIP
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = "Converted_Pages.zip";
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL object
        URL.revokeObjectURL(a.href);

    } catch (error) {
        console.error("Error creating ZIP:", error);
        alert("An error occurred while creating the ZIP file.");
    } finally {
        // Restore button state
        downloadZipBtn.innerHTML = originalText;
        downloadZipBtn.disabled = false;
    }
});
