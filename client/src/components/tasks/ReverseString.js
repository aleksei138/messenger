import { useState } from 'react'
import { TextField } from '@material-ui/core';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';

export default function ReverseString(props) {

    const [string, setString] = useState();

    function reverseString(string) {
        var result = '';
        
        if (!string)
            return result;

        for (var i = string.length -1; i >= 0; --i)
            result = result + string[i];    

        return result;
    }

    return (
        <Dialog
            maxWidth="xs"
            open={props.open}
        >
            <DialogTitle>Reverse String</DialogTitle>
            <DialogContent dividers>
            <div style={{minWidth: '400px', marginTop: '2em', marginBottom: '2em'}}>
                    <TextField
                        id="text-area"
                        fullWidth                                                    
                        placeholder="Type a string"
                        autoFocus
                        autoComplete="off"
                        onChange={event => {
                            const { value } = event.target;
                            setString(value);
                        }}
                    />
                    <div style={{marginTop: '2em', fontSize: '18px'}}>{`Reversed string: '${reverseString(string)}'`}</div>

                </div>
                
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    setString('');
                    props.onClose();
                }} color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}