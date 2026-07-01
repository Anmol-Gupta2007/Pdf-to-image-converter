const fileInput = document.getElementById('file-input');
const outputContainer = document.getElementById('output-container');
const uploadArea = document.getElementById('upload-area');

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
            // Convert file to an ArrayBuffer for PDF.js
            const typedarray = new Uint8Array(this.result);
            
            try {
                // Load the PDF document
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                
                // Iterate through every page in the PDF
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    await renderPageToImage(pdf, pageNum, file.name);
                }
            } catch (error) {
                console.error("Error reading PDF:", error);
                alert("An error occurred while processing " + file.name);
            }
        };
        fileReader.readAsArrayBuffer(file);
    }
    
    // Clear the input so the same files can be uploaded again if needed
    fileInput.value = '';
}

// --- Render PDF Page to Image ---
async function renderPageToImage(pdf, pageNum, originalName) {
    const page = await pdf.getPage(pageNum);
    
    // Scale dictates image quality. 2.0 = High Res.
    const viewport = page.getViewport({ scale: 2.0 }); 

    // Create a temporary canvas to draw the PDF page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render the page onto the canvas
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;

    // Convert the canvas to a PNG Data URL
    const imgUrl = canvas.toDataURL('image/png');
    
    // Format the new filename
    const baseName = originalName.replace('.pdf', '');
    const newFileName = `${baseName}_Page_${pageNum}.png`;

    createImageCard(imgUrl, newFileName);
}

// --- Build UI for Download ---
function createImageCard(imgUrl, fileName) {
    const card = document.createElement('div');
    card.className = 'image-card';

    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = fileName;

    const nameObj = document.createElement('p');
    nameObj.className = 'file-name';
    nameObj.textContent = fileName;

    const downloadBtn = document.createElement('a');
    downloadBtn.href = imgUrl;
    downloadBtn.download = fileName; // Triggers individual download
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Download PNG';

    card.appendChild(img);
    card.appendChild(nameObj);
    card.appendChild(downloadBtn);

    // Add new images to the top of the grid
    outputContainer.prepend(card);
}
