import { useState } from 'react'
import Container from '@material-ui/core/Container';
import { TextField } from '@material-ui/core';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';

export default function SearchList(props) {
    const source = [
        'hello',
        'how are you',
        'hope',
        'group',
        'something',
        'anything',
        'anyone',
        'any word',
        'some tea',
        'however',
        'beer',
        'beautiful',
        'dog'    
    ];


    const [list, setList] = useState(source);

    function filterList(template) {
        if (!template)
            setList(source);

        var newList = [];

        source.forEach(str => {
            if (str.includes(template))
                newList.push(str);
        });

        setList(newList);
    }

    return (
        <Dialog
            maxWidth="xs"
            open={props.open}
        >
            <DialogTitle>Search List</DialogTitle>
            <DialogContent dividers>
                <div style={{minWidth: '400px', marginTop: '2em', marginBottom: '2em', height: '60vh'}}>
                    <TextField
                        id="text-area"
                        fullWidth                                                    
                        placeholder="Search..."
                        autoFocus
                        autoComplete="off"
                        onChange={event => {
                            const { value } = event.target;
                            filterList(value);
                        }}
                    />
                    <div>
                        { list.map(element => (
                                <div style={{marginTop: '1em', marginBottom: '1em', fontSize: '18px'}}>{element}</div>
                            ))
                        }
                        { list.length === 0 &&
                            <div  style={{marginTop: '1em', marginBottom: '1em', fontSize: '18px'}}>No items match your search</div>
                        }
                    </div>
                </div>                
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    setList(source);
                    props.onClose();
                }} color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}