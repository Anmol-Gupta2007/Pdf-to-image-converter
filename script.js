const fileInput = document.getElementById('file-input');
const outputContainer = document.getElementById('output-container');
const uploadArea = document.getElementById('upload-area');
const actionsContainer = document.getElementById('actions-container');
const downloadAllBtn = document.getElementById('download-all-btn');

// Array to keep track of all generated images for the "Download All" feature
let generatedImages = [];

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
                
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    await renderPageToImage(pdf, pageNum, file.name);
                }

                // Show the "Download All" button once processing is done
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

    // Store in our array for the "Download All" feature
    generatedImages.push({ url: imgUrl, filename: newFileName });

    // Build the UI card
    createImageCard(imgUrl, newFileName);
}

// --- Build UI for Individual Download ---
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
    downloadBtn.download = fileName;
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Download PNG';

    card.appendChild(img);
    card.appendChild(nameObj);
    card.appendChild(downloadBtn);

    outputContainer.prepend(card);
}

// --- Download All Logic ---
downloadAllBtn.addEventListener('click', async () => {
    // Loop through the array and trigger downloads
    for (let i = 0; i < generatedImages.length; i++) {
        const imageFile = generatedImages[i];
        
        // Create a temporary link element
        const a = document.createElement('a');
        a.href = imageFile.url;
        a.download = imageFile.filename;
        
        // Append, click, and remove to trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Crucial: Wait 300 milliseconds between downloads
        // This prevents the browser from thinking it's spam and blocking the files
        await new Promise(resolve => setTimeout(resolve, 300));
    }
});
