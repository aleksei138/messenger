import { useState, useEffect } from 'react'
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import ReverseString from './ReverseString'
import SearchList from './SearchList'
import ImageUpload from './ImageUpload'
import ExcelPreview from './ExcelPreview'
import ExcelEdit from './ExcelEdit'
import FlipCameraAndroidIcon from '@material-ui/icons/FlipCameraAndroid'
import SearchIcon from '@material-ui/icons/Search'
import PhotoLibraryIcon from '@material-ui/icons/PhotoLibrary'
import VisibilityIcon from '@material-ui/icons/Visibility'
import EditIcon from '@material-ui/icons/Edit'

export default function Tasks() {
    const [reverseOpen, setReverseOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const [excelPreview, setExcelPreview] = useState(false);
    const [excelEdit, setExcelEdit] = useState(false);

    useEffect(() => {
        document.title = 'Tasks';
    }, []);
    

    return (
        <Container component="main" maxWidth="md" style={{boxShadow: 'rgb(136, 136, 136) 0px 0px 20px 5px', height: '100vh', padding: '0px'}}>
            <div style={{display: 'flex', backgroundColor: '#c2d8e6', height: '100%'}}>

                <div style={{marginTop: 'auto', marginBottom: 'auto', marginRight: 'auto', marginLeft: 'auto', width: '50%'}}>
                    <Typography style={{margin: '0.5em'}} component="h1" variant="h5">
                        Select an option:
                    </Typography>

                    <Button className='task-button' onClick={() => setReverseOpen(true)} variant="contained" startIcon={<FlipCameraAndroidIcon />}>Reverse String</Button>
                    <ReverseString open={reverseOpen} onClose={() => setReverseOpen(false)}/>

                    <Button className='task-button' onClick={() => setSearchOpen(true)} variant="contained" startIcon={<SearchIcon />}>Search List</Button>
                    <SearchList open={searchOpen} onClose={() => setSearchOpen(false)}/>                    

                    <Button className='task-button' onClick={() => {setExcelPreview(true)}} variant="contained" startIcon={<VisibilityIcon />}>Preview Excel</Button> 
                    <ExcelPreview open={excelPreview} onClose={() => setExcelPreview(false)}/>

                    <Button className='task-button' onClick={() => setExcelEdit(true)} variant="contained" startIcon={<EditIcon />}>Edit Excel</Button>
                    <ExcelEdit open={excelEdit} onClose={() => setExcelEdit(false)}/>

                    <Button className='task-button' onClick={() => setImageOpen(true)} variant="contained" startIcon={<PhotoLibraryIcon />}>Upload image</Button> 
                    <ImageUpload open={imageOpen} onClose={() => setImageOpen(false)}/>

                </div>

            </div>

        </Container>
    );
}