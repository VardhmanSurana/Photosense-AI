import { useState } from 'react';
import { PhotoRecord, db } from '@/lib/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, Calendar, HardDrive, Trash2 } from 'lucide-react';
import { generateImageDescription } from '@/lib/mistral';
import { IMAGE_PROMPT } from '@/lib/Prompts';
import React from 'react';

interface PhotoGridProps {
  photos: PhotoRecord[];
  loading?: boolean;
  onPhotoDelete: (id: number) => void;
  searchQuery?: string; // Add searchQuery prop
}

export default function PhotoGrid({ photos, loading, onPhotoDelete, searchQuery }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoRecord | null>(null);

  // Helper function to highlight text
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;

    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const lowerCaseText = text.toLowerCase();
    const lowerCaseQuery = query.toLowerCase();

    // Split the query into individual terms for highlighting
    const queryTerms = lowerCaseQuery.split(/\s+/).filter(term => term.length > 0);

    // Create a regex that matches any of the query terms
    const regex = new RegExp(`(${queryTerms.join('|')})`, 'gi');

    text.replace(regex, (match, p1, offset) => {
      if (offset > lastIndex) {
        parts.push(<React.Fragment key={lastIndex}>{text.substring(lastIndex, offset)}</React.Fragment>);
      }
      parts.push(<span key={offset} className="bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white rounded px-0.5">{match}</span>);
      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < text.length) {
      parts.push(<React.Fragment key={lastIndex}>{text.substring(lastIndex)}</React.Fragment>);
    }

    return <>{parts}</>;
  };

  const handleDeletePhoto = async () => {
    if (photoToDelete && photoToDelete.id !== undefined) {
      try {
        await db.deletePhoto(photoToDelete.id);
        onPhotoDelete(photoToDelete.id);
        console.log('Photo deleted:', photoToDelete.id);
      } catch (error) {
        console.error('Error deleting photo:', error);
      }
      setPhotoToDelete(null);
      setSelectedPhoto(null); // Close detail view if open
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square bg-muted animate-pulse" />
            <CardContent className="p-3">
              <div className="h-4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No photos found</h3>
        <p className="text-muted-foreground">
          Try uploading a folder or adjusting your search terms
        </p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <Card 
            key={photo.id} 
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
              {photo.thumbnail ? (
                <img
                  src={photo.thumbnail}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Eye className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <CardContent className="p-3 relative">
              <h4 className="font-medium text-sm truncate mb-1">
                {highlightText(photo.filename, searchQuery || '')}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {highlightText(photo.description, searchQuery || '')}
              </p>
              {photo.processed === 1 && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  Processed
                </Badge>
              )}
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute bottom-2 right-2 h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent opening the photo dialog
                  setPhotoToDelete(photo);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{highlightText(selectedPhoto.filename, searchQuery || '')}</DialogTitle>
                <DialogDescription>
                  Details and AI-generated description for {highlightText(selectedPhoto.filename, searchQuery || '')}.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedPhoto.thumbnail && (
                  <div className="flex justify-center">
                    <img
                      src={selectedPhoto.thumbnail}
                      alt={selectedPhoto.filename}
                      className="max-w-full max-h-96 object-contain rounded-lg"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {highlightText(selectedPhoto.description, searchQuery || '')}
                    </p>
                    
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span>{formatFileSize(selectedPhoto.size)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(selectedPhoto.lastModified).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPhoto.path}
                    </div>
                  </div>
                  {selectedPhoto.extracted_text && selectedPhoto.extracted_text !== "N/A" && (
                    <div>
                      <h4 className="font-medium mb-2">Extracted Text</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        {highlightText(selectedPhoto.extracted_text, searchQuery || '')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the photo 
              <span className="font-semibold">{photoToDelete?.filename}</span> from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}