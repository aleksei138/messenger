import { useState,  useRef } from 'react'
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import ImageIcon from '@material-ui/icons/Image';
import $ from 'jquery'
import './tasks.css'

export default function ImageUpload(props) {

    function setAndSaveImage(event) {
        if (!event.target || !event.target.files || !event.target.files[0])
            return;
        // set src of image
        $('#image').attr('src', window.URL.createObjectURL(event.target.files[0]));  
        
        // send image to canvas to compress it
        const canvas = document.createElement('canvas');
        canvas.height = 40;
        canvas.width = 40;
        const context = canvas.getContext('2d');

        // when loaded, save
        $('#image').on('load', e => {  

            const img = document.getElementById('image');         
            context.drawImage(img, 0, 0, 40, 40);
            const data = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");    
            
            fetch('/api/tasks/saveImage', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                  },
                body:  JSON.stringify({name: event.target.files[0].name, data})
            }).then(response => {
                response.json().then(result => {
                    if (response.ok) {
                        setList([result, ...list]); // add to list of recent uploads
                    }
                }).catch(err => {
                    console.error(err);
                });
            });
            $('#image').off('load'); // !!! 
        });   
    }

    const [list, setList] = useState([]);

    function loadRecent() {
        fetch('/api/tasks/getImageList').then((response) => {
            if (!response.ok)
                throw new Error();
            return response.json();
        }).then((data) => {
            setList(data);
        }).catch((error) => {
            console.error(error);
        });
    }

    return (
        <Dialog
            maxWidth="xs"
            open={props.open}
            onEnter={loadRecent}
        >
            <DialogTitle>Upload Image</DialogTitle>
            <DialogContent dividers>
                <div style={{minWidth: '400px', height: '50vh'}}>

                    <div style={{display: 'flex', marginBottom: '2em'}}>

                        <Button component="label" variant="contained" color="primary" startIcon={<ImageIcon />}>
                            <input onChange={setAndSaveImage} style={{display: 'none'}} type="file" accept="image/png, image/jpeg"/>
                            Choose an image
                        </Button>

                        <img id="image" src="#" alt=""/>
                    </div>
                        { list[0] &&
                            <div style={{fontSize: '18px'}}>Recent uploads:</div>
                        }   
                    <div>              
                        {
                            list.map(element => (
                                <div className="file-list-element" onClick={() => $('#image').attr('src', `/api/tasks/image/${element.id}`) }>{element.name}</div>
                            ))
                        }
                    </div>
                </div>                
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    setList([]);
                    props.onClose();
                }} color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}